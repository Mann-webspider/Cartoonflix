# infra-lambda

Terraform for the viewer API Lambda, and nothing else.

Separate from `infra/` on purpose. That config owns the whole platform — S3,
CloudFront, ECS, SQS, API Gateway — and applying it against an account that
already has buckets and a distribution would try to create duplicates. This one
creates six resources, keeps its own state, and touches nothing you already
have.

## What it creates

| Resource | Why |
|---|---|
| `aws_iam_role` + basic-execution attachment | Logs only. The function reaches Atlas and TMDB over the public internet, so it needs no AWS data-plane permissions. |
| `aws_cloudwatch_log_group` | Declared explicitly so it has a 14-day retention. The one Lambda auto-creates never expires. |
| `aws_lambda_function` | `provided.al2023`, handler `bootstrap`, 512 MB, 30s timeout. |
| `aws_lambda_function_url` | Public HTTPS endpoint. |
| `aws_lambda_permission` | Without it the URL returns 403 to everyone. |

## About the network

**There is no `vpc_config`, and that is the open-network configuration.**

A Lambda outside a VPC has full outbound internet access — which is exactly what
this function needs, since MongoDB Atlas and TMDB are both public services.

Attaching it to a VPC, *including the default one*, does the opposite of what it
sounds like: the function's network interface gets no public IP, so it loses
internet access entirely. Restoring it needs a NAT gateway at roughly $32/month,
which is more than this entire project costs to run. There is nothing private in
the account for the function to reach, so a VPC would be paying to remove a
capability.

Atlas still needs to accept the connection: **Network Access → allow
`0.0.0.0/0`**. The database remains protected by its credentials.

## Use

Build the artifact first — Terraform uploads `user-backend/dist/lambda.zip` and
will not build it for you:

```bash
cd ../user-backend && go run ./tools/package
```

Then:

```bash
cd ../infra-lambda && cp terraform.tfvars.example terraform.tfvars
```

Fill in `mongo_uri` and `jwt_secret`, then:

```bash
terraform init && terraform apply
```

`api_base_url` is printed on success — set it as `NEXT_PUBLIC_API_URL` in Vercel.

## Redeploying code

```bash
cd ../user-backend && go run ./tools/package && cd ../infra-lambda && terraform apply
```

`source_code_hash` is what makes Terraform notice the rebuilt zip. Without it,
`apply` reports no changes after a code edit.

## Verify

```bash
curl -i "$(terraform output -raw function_url)api/v1/health"
```

`200` with `{"status":"ok"}` proves the binary started and the handler is wired —
no database involved. Then check Atlas connectivity:

```bash
curl -s "$(terraform output -raw api_base_url)/contents" | head -c 200
```

And that browsers will accept the responses:

```bash
curl -i -X OPTIONS "$(terraform output -raw api_base_url)/contents" -H "Origin: https://your-app.vercel.app" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization"
```

Logs:

```bash
aws logs tail "$(terraform output -raw log_group)" --follow
```

## Notes

- **CORS is set by the application, not by the Function URL.** Configuring both
  emits duplicate `Access-Control-Allow-Origin` headers, which browsers reject.
  Control it with the `allowed_origins` variable.
- `arm64` is about 20% cheaper per GB-second, but the zip has to match:
  `go run ./tools/package -arch arm64` alongside `architecture = "arm64"`.
- `mongo_uri` and `jwt_secret` land in the function's environment in plain text
  and in Terraform state. For anything beyond a personal deployment, move them
  to Secrets Manager and set `MONGO_SECRET_ARN` / `JWT_SECRET_ARN` instead —
  `config.LoadSecrets` already reads those at cold start.

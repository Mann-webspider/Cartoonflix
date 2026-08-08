# Deploying the viewer API to Lambda by hand

Terraform in `infra/` does all of this for you. This is the manual route — for
understanding what Terraform creates, or for getting one function live without
standing up the whole stack.

Everything below uses **`ap-south-1`**. Change it consistently if you deploy elsewhere.

---

## 1. Build the artifact

```bash
cd user-backend && go run ./tools/package
```

Produces `dist/lambda.zip` (~5 MB). Go is the only tool needed — no `make`, no `zip`.

> **Do not zip this by hand on Windows.** PowerShell's `Compress-Archive` writes
> no Unix permission bits, so `bootstrap` loses its executable flag and the
> function dies at cold start with `fork/exec /var/task/bootstrap: permission
> denied`. The packager sets mode `0755` explicitly.

Verify before uploading:

```bash
python -c "import zipfile;i=zipfile.ZipFile('dist/lambda.zip').infolist()[0];print(i.filename, oct((i.external_attr>>16)&0o777))"
```

Expect `bootstrap 0o755`.

---

## 2. Create the execution role

```bash
aws iam create-role --role-name cartoonflix-user-api-role --assume-role-policy-document file://trust-policy.json
```

Where `trust-policy.json` is:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach log permissions — without these the function runs but you cannot see why it failed:

```bash
aws iam attach-role-policy --role-name cartoonflix-user-api-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

---

## 3. Create the function

`bootstrap` is both the handler name and the filename; `provided.al2023` is the
Go runtime.

```bash
aws lambda create-function --function-name cartoonflix-user-api --runtime provided.al2023 --handler bootstrap --architectures x86_64 --role arn:aws:iam::<ACCOUNT_ID>:role/cartoonflix-user-api-role --zip-file fileb://dist/lambda.zip --timeout 30 --memory-size 512 --region ap-south-1
```

**Timeout 30s, not the 3s default.** A cold start opens a MongoDB Atlas
connection, and 3 seconds is not enough — you would get opaque timeouts that
look like broken code.

---

## 4. Set the environment

```bash
aws lambda update-function-configuration --function-name cartoonflix-user-api --region ap-south-1 --environment "Variables={MONGO_URI=mongodb+srv://USER:PASS@CLUSTER/,JWT_SECRET=<a long random string>,ALLOWED_ORIGINS=https://your-app.vercel.app}"
```

| Variable | Why |
|---|---|
| `MONGO_URI` | Atlas connection string. |
| `JWT_SECRET` | Signs viewer tokens. Any long random string; keep it stable or every session is invalidated. |
| `ALLOWED_ORIGINS` | Comma-separated browser origins. **Miss this and the browser blocks every response** while the API returns 200 — the failure mode looks exactly like broken auth. |
| `CLOUDFRONT_DOMAIN` | Only if you re-enable signed URLs. |

For real deployments prefer `MONGO_SECRET_ARN` / `JWT_SECRET_ARN` pointing at
Secrets Manager — `config.LoadSecrets` fetches those at cold start and they stay
out of the function's visible configuration. Plain env vars are fine to get
running.

---

## 5. Expose it with a Function URL

The handler takes `events.APIGatewayV2HTTPRequest`, and **Lambda Function URLs
use that exact payload format (2.0)** — so no API Gateway is needed. One less
thing to configure, and no per-request gateway cost.

```bash
aws lambda create-function-url-config --function-name cartoonflix-user-api --auth-type NONE --region ap-south-1
```

```bash
aws lambda add-permission --function-name cartoonflix-user-api --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --statement-id FunctionURLAllowPublicAccess --region ap-south-1
```

That second command is required. Without it the URL exists and returns 403 for
everyone, including you.

The URL is printed by the first command as `FunctionUrl`.

---

## 6. Let Atlas accept the connection

In Atlas → **Network Access**, allow `0.0.0.0/0`.

Lambda has no fixed outbound IP unless you put it in a VPC with a NAT gateway,
and a NAT gateway costs about $32/month — which would dwarf this project's
entire bill. The database is still protected by its username and password.

Skipping this step is the single most common reason a correct deployment
returns 500 on every route.

---

## 7. Test it

Health check — no database, so this proves the function starts and the handler
is wired:

```bash
curl -i https://<FUNCTION_URL>/api/v1/health
```

Expect `200` and `{"status":"ok"}`. A 502 here means the binary did not start —
check the executable bit and the logs.

Catalogue — this one proves Atlas connectivity:

```bash
curl -s https://<FUNCTION_URL>/api/v1/contents | head -c 300
```

CORS preflight — this proves the browser will accept the responses:

```bash
curl -i -X OPTIONS "https://<FUNCTION_URL>/api/v1/contents" -H "Origin: https://your-app.vercel.app" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization"
```

Expect `access-control-allow-origin` echoing your origin and
`access-control-allow-headers` containing `authorization`. If the origin is
missing, `ALLOWED_ORIGINS` is wrong — fix that before blaming the frontend.

Sign-up, end to end:

```bash
curl -s -X POST https://<FUNCTION_URL>/api/v1/auth/signup -H "content-type: application/json" -d "{\"username\":\"tester\",\"email\":\"tester@example.com\",\"password\":\"correct-horse\"}"
```

Expect `201` with a token.

Read the logs when something is wrong:

```bash
aws logs tail /aws/lambda/cartoonflix-user-api --follow --region ap-south-1
```

---

## 8. Point the viewer at it

In Vercel, set `NEXT_PUBLIC_API_URL` to `https://<FUNCTION_URL>/api/v1` (no
trailing slash), then redeploy. Add that Vercel domain to `ALLOWED_ORIGINS` on
the function.

---

## Redeploying after a code change

```bash
cd user-backend && go run ./tools/package
```

```bash
aws lambda update-function-code --function-name cartoonflix-user-api --zip-file fileb://dist/lambda.zip --region ap-south-1 --no-cli-pager
```

---

## When it goes wrong

| Symptom | Cause |
|---|---|
| `fork/exec /var/task/bootstrap: permission denied` | Zip built without the executable bit. Repackage with `go run ./tools/package`. |
| 502 on every route, nothing in logs | Handler or runtime mismatch. Handler must be `bootstrap`, runtime `provided.al2023`. |
| 403 on the Function URL | The `add-permission` call in step 5 was skipped. |
| 500 on data routes, `/health` fine | Atlas is refusing the connection — step 6. |
| Timeouts on first request only | Cold start exceeding the timeout. Raise it to 30s. |
| Browser shows failures, curl works | `ALLOWED_ORIGINS` does not include the site's origin. |

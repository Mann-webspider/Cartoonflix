/**
 * Standalone Lambda for the viewer API.
 *
 * Deliberately separate from `infra/`, which provisions the whole platform
 * (S3, CloudFront, ECS, SQS, API Gateway). This config owns ONE function and
 * nothing else, so it can be applied against an account that already has
 * buckets and a distribution without Terraform trying to adopt or destroy them.
 * It keeps its own state file.
 */

locals {
  # Where `go run ./tools/package` writes the artifact.
  artifact = "${path.module}/../user-backend/dist/lambda.zip"
}

# --- Execution role -----------------------------------------------------------

resource "aws_iam_role" "this" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Logs only. This function talks to MongoDB Atlas and CloudFront over the public
# internet, so it needs no AWS data-plane permissions at all.
resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Logs ---------------------------------------------------------------------

# Created explicitly rather than letting Lambda auto-create it, because the
# implicit one never expires and quietly accrues cost forever.
resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
}

# --- Function -----------------------------------------------------------------

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = aws_iam_role.this.arn

  # Go compiles to a self-contained binary, which the OS-only runtime executes
  # directly. The handler name must match the filename inside the zip.
  runtime       = "provided.al2023"
  handler       = "bootstrap"
  architectures = [var.architecture]

  filename = local.artifact
  # Without this Terraform cannot tell that a rebuilt zip differs, and `apply`
  # reports no changes after a code edit.
  source_code_hash = filebase64sha256(local.artifact)

  # 30s, not the 3s default: a cold start opens a MongoDB Atlas connection, and
  # 3 seconds is not enough. The resulting timeouts look like broken code.
  timeout     = var.timeout_seconds
  memory_size = var.memory_mb

  # NO vpc_config, on purpose.
  #
  # A Lambda outside a VPC has full outbound internet access, which is what it
  # needs to reach Atlas and TMDB. Attaching it to a VPC — including the default
  # one — gives its network interface no public IP, so it would lose internet
  # entirely unless the subnets route through a NAT gateway at roughly $32/month.
  # There is nothing private to reach here, so a VPC would cost money to remove
  # a capability.

  environment {
    variables = merge(
      {
        MONGO_URI       = var.mongo_uri
        JWT_SECRET      = var.jwt_secret
        ALLOWED_ORIGINS = join(",", var.allowed_origins)
      },
      # Only set when signed URLs are in use; an empty value would be worse than
      # an absent one, since the signer treats "" as a configured-but-broken key.
      var.cloudfront_domain == "" ? {} : { CLOUDFRONT_DOMAIN = var.cloudfront_domain },
      var.cloudfront_keypair_id == "" ? {} : { CLOUDFRONT_KEYPAIR_ID = var.cloudfront_keypair_id },
    )
  }

  # Terraform would otherwise create the function first and race the log group.
  depends_on = [
    aws_iam_role_policy_attachment.logs,
    aws_cloudwatch_log_group.this,
  ]
}

# --- Public endpoint ----------------------------------------------------------

# A Function URL rather than API Gateway: the handler takes an
# APIGatewayV2HTTPRequest, and Function URLs deliver exactly that payload format
# (2.0). API Gateway would add a second component and a per-request charge for
# no behavioural difference.
#
# CORS is deliberately NOT configured here. The application sets its own headers
# from ALLOWED_ORIGINS, and configuring both layers produces duplicate
# Access-Control-Allow-Origin headers, which browsers reject outright.
resource "aws_lambda_function_url" "this" {
  function_name      = aws_lambda_function.this.function_name
  authorization_type = "NONE"
}

# Without this the URL exists and returns 403 to everyone, including you.
resource "aws_lambda_permission" "function_url" {
  statement_id           = "AllowPublicFunctionUrlAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.this.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

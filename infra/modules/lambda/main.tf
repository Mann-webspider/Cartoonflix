locals {
  assume_lambda = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  logs_stmt = {
    Effect   = "Allow"
    Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    Resource = "arn:aws:logs:*:*:*"
  }
}

# ===========================================================================
# Orchestrator — SQS message -> ecs RunTask (ephemeral Fargate)
# ===========================================================================
resource "aws_iam_role" "orchestrator" {
  name               = "${var.project}-orchestrator"
  assume_role_policy = local.assume_lambda
}

resource "aws_iam_role_policy" "orchestrator" {
  name = "policy"
  role = aws_iam_role.orchestrator.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.logs_stmt,
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = var.queue_arn
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:RunTask"]
        Resource = var.task_def_arn
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [var.task_exec_role, var.task_role_arn]
      }
    ]
  })
}

resource "aws_lambda_function" "orchestrator" {
  function_name = "${var.project}-orchestrator"
  role          = aws_iam_role.orchestrator.arn
  runtime       = "nodejs20.x"
  handler       = "orchestrator.handler"
  filename      = var.orchestrator_zip
  timeout       = 30

  environment {
    variables = {
      CLUSTER_ARN    = var.cluster_arn
      TASK_DEF_ARN   = var.task_def_arn
      CONTAINER_NAME = var.container_name
      SUBNETS        = join(",", var.subnet_ids)
      SECURITY_GROUP = var.security_group
      RAW_BUCKET     = var.raw_bucket_name
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs_to_orchestrator" {
  event_source_arn = var.queue_arn
  function_name    = aws_lambda_function.orchestrator.arn
  batch_size       = 1
}

# ===========================================================================
# Completion handler — ECS task STOPPED -> mark content ready in DB
# ===========================================================================
resource "aws_iam_role" "completion" {
  name               = "${var.project}-completion"
  assume_role_policy = local.assume_lambda
}

resource "aws_iam_role_policy" "completion" {
  name = "policy"
  role = aws_iam_role.completion.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.logs_stmt,
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.mongo_secret_arn
      }
    ]
  })
}

resource "aws_lambda_function" "completion" {
  function_name = "${var.project}-completion"
  role          = aws_iam_role.completion.arn
  runtime       = "nodejs20.x"
  handler       = "completion.handler"
  filename      = var.completion_zip
  timeout       = 30

  environment {
    variables = {
      MONGO_SECRET_ARN  = var.mongo_secret_arn
      CLOUDFRONT_DOMAIN = var.cloudfront_domain
    }
  }
}

resource "aws_cloudwatch_event_rule" "task_stopped" {
  name        = "${var.project}-task-stopped"
  description = "Transcode task finished"
  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Task State Change"]
    detail = {
      lastStatus = ["STOPPED"]
      clusterArn = [var.cluster_arn]
    }
  })
}

resource "aws_cloudwatch_event_target" "completion" {
  rule = aws_cloudwatch_event_rule.task_stopped.name
  arn  = aws_lambda_function.completion.arn
}

resource "aws_lambda_permission" "completion_events" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.completion.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.task_stopped.arn
}

# ===========================================================================
# Admin API (Node/Express via serverless-http)
# ===========================================================================
resource "aws_iam_role" "admin_api" {
  name               = "${var.project}-admin-api"
  assume_role_policy = local.assume_lambda
}

resource "aws_iam_role_policy" "admin_api" {
  name = "policy"
  role = aws_iam_role.admin_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.logs_stmt,
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [var.mongo_secret_arn, var.jwt_secret_arn]
      },
      {
        # credentials must allow the operations being presigned:
        # movies -> raw bucket, posters/thumbnails -> hls bucket under posters/
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = [
          "arn:aws:s3:::${var.raw_bucket_name}/*",
          "arn:aws:s3:::${var.hls_bucket_name}/posters/*",
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "admin_api" {
  function_name = "${var.project}-admin-api"
  role          = aws_iam_role.admin_api.arn
  runtime       = "nodejs20.x"
  handler       = "lambda.handler"
  filename      = var.admin_api_zip
  timeout       = 30

  environment {
    variables = {
      MONGO_SECRET_ARN  = var.mongo_secret_arn
      JWT_SECRET_ARN    = var.jwt_secret_arn
      RAW_BUCKET        = var.raw_bucket_name
      HLS_BUCKET        = var.hls_bucket_name
      CLOUDFRONT_DOMAIN = var.cloudfront_domain
    }
  }
}

# ===========================================================================
# User API (Go/Fiber via lambda adapter)
# ===========================================================================
resource "aws_iam_role" "user_api" {
  name               = "${var.project}-user-api"
  assume_role_policy = local.assume_lambda
}

resource "aws_iam_role_policy" "user_api" {
  name = "policy"
  role = aws_iam_role.user_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.logs_stmt,
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [var.mongo_secret_arn, var.cf_key_secret_arn, var.jwt_secret_arn]
      }
    ]
  })
}

resource "aws_lambda_function" "user_api" {
  function_name = "${var.project}-user-api"
  role          = aws_iam_role.user_api.arn
  runtime       = "provided.al2023"
  handler       = "bootstrap"
  filename      = var.user_api_zip
  timeout       = 30

  environment {
    variables = {
      MONGO_SECRET_ARN      = var.mongo_secret_arn
      CF_KEY_SECRET_ARN     = var.cf_key_secret_arn
      JWT_SECRET_ARN        = var.jwt_secret_arn
      CLOUDFRONT_KEYPAIR_ID = var.cf_public_key_id
      CLOUDFRONT_DOMAIN     = var.cloudfront_domain
      # Without the viewer app's origin here, the browser blocks every response
      # and the app reports failures the API never returned.
      ALLOWED_ORIGINS = var.allowed_origins
    }
  }
}

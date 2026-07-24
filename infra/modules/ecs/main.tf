locals {
  container_name = "transcode-worker"
}

resource "aws_ecs_cluster" "this" {
  name = "${var.project}-cluster"
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${var.project}-transcode"
  retention_in_days = 14
}

# --- Execution role: pull image, write logs ---
resource "aws_iam_role" "exec" {
  name = "${var.project}-task-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "exec_managed" {
  role       = aws_iam_role.exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- Task role: read raw, write HLS ---
resource "aws_iam_role" "task" {
  name = "${var.project}-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "task_s3" {
  name = "${var.project}-task-s3"
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${var.raw_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${var.hls_bucket_arn}/*"
      }
    ]
  })
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.project}-transcode"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.exec.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = local.container_name
    image     = var.worker_image
    essential = true
    environment = [
      { name = "AWS_REGION", value = var.aws_region },
      { name = "RAW_BUCKET", value = var.raw_bucket_name },
      { name = "HLS_BUCKET", value = var.hls_bucket_name },
      { name = "CLOUDFRONT_DOMAIN", value = var.cloudfront_domain }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "worker"
      }
    }
  }])
}

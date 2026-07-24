resource "aws_apigatewayv2_api" "this" {
  name          = "${var.project}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"] # tighten to your app origins in production
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }
}

# --- Admin integration (more specific route, matched first) ---
resource "aws_apigatewayv2_integration" "admin" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.admin_lambda_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "admin" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "ANY /api/v1/admin/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_lambda_permission" "admin" {
  statement_id  = "AllowApiGwAdmin"
  action        = "lambda:InvokeFunction"
  function_name = var.admin_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

# --- User integration (catch-all under /api/v1) ---
resource "aws_apigatewayv2_integration" "user" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.user_lambda_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "user" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "ANY /api/v1/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.user.id}"
}

resource "aws_lambda_permission" "user" {
  statement_id  = "AllowApiGwUser"
  action        = "lambda:InvokeFunction"
  function_name = var.user_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
}

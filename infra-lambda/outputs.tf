output "api_base_url" {
  description = "Set this as NEXT_PUBLIC_API_URL in Vercel."
  value       = "${trimsuffix(aws_lambda_function_url.this.function_url, "/")}/api/v1"
}

output "function_url" {
  description = "Raw Function URL, for curl checks against /api/v1/health."
  value       = aws_lambda_function_url.this.function_url
}

output "function_name" {
  value = aws_lambda_function.this.function_name
}

output "log_group" {
  description = "aws logs tail <this> --follow"
  value       = aws_cloudwatch_log_group.this.name
}

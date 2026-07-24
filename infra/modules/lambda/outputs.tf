output "admin_api_invoke_arn" {
  value = aws_lambda_function.admin_api.invoke_arn
}

output "admin_api_function_name" {
  value = aws_lambda_function.admin_api.function_name
}

output "user_api_invoke_arn" {
  value = aws_lambda_function.user_api.invoke_arn
}

output "user_api_function_name" {
  value = aws_lambda_function.user_api.function_name
}

output "orchestrator_function_name" {
  value = aws_lambda_function.orchestrator.function_name
}

output "completion_function_name" {
  value = aws_lambda_function.completion.function_name
}

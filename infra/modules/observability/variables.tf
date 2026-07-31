variable "project" { type = string }
variable "aws_region" { type = string }
variable "function_names" { type = list(string) }
variable "queue_name" { type = string }
variable "dlq_name" { type = string }

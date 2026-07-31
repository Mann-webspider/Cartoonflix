variable "project" { type = string }
variable "aws_region" { type = string }

# queue
variable "queue_arn" { type = string }
variable "queue_url" { type = string }

# ecs run-task target
variable "cluster_arn" { type = string }
variable "task_def_arn" { type = string }
variable "task_exec_role" { type = string }
variable "task_role_arn" { type = string }
variable "container_name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group" { type = string }
variable "raw_bucket_name" { type = string }

# packages
variable "admin_api_zip" { type = string }
variable "user_api_zip" { type = string }
variable "orchestrator_zip" { type = string }
variable "completion_zip" { type = string }

# runtime config
variable "mongo_secret_arn" { type = string }
variable "cf_key_secret_arn" { type = string }
variable "jwt_secret_arn" { type = string }
variable "cloudfront_domain" { type = string }
variable "cf_key_group_id" { type = string }
variable "cf_public_key_id" { type = string }

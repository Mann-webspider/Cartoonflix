variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project" {
  type    = string
  default = "cartoonflix"
}

variable "tags" {
  type = map(string)
  default = {
    Project   = "cartoonflix"
    ManagedBy = "terraform"
  }
}

variable "mongo_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB Atlas connection string. Stored in Secrets Manager, not exposed as a Lambda env value."
}

variable "cloudfront_public_key_pem" {
  type        = string
  description = "PEM contents of the CloudFront PUBLIC key used to verify signed URLs (safe to keep in tfvars)."
}

variable "cloudfront_private_key_pem" {
  type        = string
  sensitive   = true
  description = "PEM contents of the CloudFront PRIVATE key. Stored in Secrets Manager; the user API fetches it at runtime."
}

variable "raw_retention_days" {
  type        = number
  default     = 7
  description = "Days before raw uploads expire from the raw bucket."
}

# Build artifacts (produced by CI). Paths relative to infra/.
variable "worker_image_tag" {
  type    = string
  default = "latest"
}

variable "admin_api_lambda_zip" {
  type    = string
  default = "../admin-backend/dist/lambda.zip"
}

variable "user_api_lambda_zip" {
  type    = string
  default = "../user-backend/dist/lambda.zip"
}

variable "orchestrator_lambda_zip" {
  type    = string
  default = "../ffmpeg-service/dist/orchestrator.zip"
}

variable "completion_lambda_zip" {
  type    = string
  default = "../ffmpeg-service/dist/completion.zip"
}

# Origins allowed to call the viewer API and fetch media from CloudFront.
# Comma separated for the API; the CloudFront module takes the list form.
variable "allowed_origins" {
  description = "Viewer app origins, e.g. https://cartoonflix.vercel.app"
  type        = list(string)
  default     = ["*"]
}

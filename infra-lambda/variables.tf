variable "aws_region" {
  description = "Region to deploy into."
  type        = string
  default     = "ap-south-1"
}

variable "function_name" {
  description = "Lambda function name. Also names the role and log group."
  type        = string
  default     = "cartoonflix-user-api"
}

variable "mongo_uri" {
  description = "MongoDB Atlas connection string."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Signs viewer tokens. Changing it invalidates every session."
  type        = string
  sensitive   = true

  # A deploy went out with the placeholder from terraform.tfvars.example still
  # in place. That string is published in this repository, so anyone could have
  # forged a token for any account — including one claiming role "admin".
  # Terraform now refuses rather than letting it happen silently again.
  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "jwt_secret must be at least 32 characters. Generate one: openssl rand -base64 48"
  }

  validation {
    condition     = !can(regex("(?i)replace|example|changeme|placeholder|secret123", var.jwt_secret))
    error_message = "jwt_secret still looks like a placeholder. Generate a real one: openssl rand -base64 48"
  }
}

variable "allowed_origins" {
  description = <<-EOT
    Browser origins permitted to call the API, e.g.
    ["https://cartoonflix.vercel.app"].

    A browser discards responses from an unlisted origin, which looks exactly
    like the API failing while it is in fact returning 200. Defaults to "*" so a
    first deploy works; note that browsers refuse to send credentialed requests
    to a wildcard origin, so set the real one before relying on cookies.
  EOT
  type        = list(string)
  default     = ["*"]
}

variable "cloudfront_domain" {
  description = "Existing CloudFront domain, only needed if signed URLs are re-enabled."
  type        = string
  default     = ""
}

variable "cloudfront_keypair_id" {
  description = "CloudFront public key id, only needed if signed URLs are re-enabled."
  type        = string
  default     = ""
}

variable "architecture" {
  description = <<-EOT
    x86_64 or arm64. arm64 is roughly 20% cheaper per GB-second, but the zip
    must be built to match: `go run ./tools/package -arch arm64`.
  EOT
  type        = string
  default     = "x86_64"

  validation {
    condition     = contains(["x86_64", "arm64"], var.architecture)
    error_message = "architecture must be x86_64 or arm64."
  }
}

variable "memory_mb" {
  description = "More memory also buys proportionally more CPU, which shortens cold starts."
  type        = number
  default     = 512
}

variable "timeout_seconds" {
  description = "Must exceed an Atlas cold-start connection; 3s is not enough."
  type        = number
  default     = 30
}

variable "log_retention_days" {
  description = "CloudWatch retention. Unset means never expire, which costs forever."
  type        = number
  default     = 14
}

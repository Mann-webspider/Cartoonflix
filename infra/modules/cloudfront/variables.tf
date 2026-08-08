variable "project" {
  type = string
}

variable "hls_bucket_id" {
  type = string
}

variable "hls_bucket_arn" {
  type = string
}

variable "hls_bucket_domain_name" {
  type = string
}

variable "public_key_pem" {
  type = string
}

# Origins allowed to fetch segments and WebVTT tracks. Defaults to "*" so a
# fresh deploy plays before a domain exists; narrow this to the viewer app's
# origin once it has one.
variable "allowed_origins" {
  type    = list(string)
  default = ["*"]
}

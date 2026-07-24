output "api_endpoint" {
  description = "Base URL of the HTTP API"
  value       = module.apigw.api_endpoint
}

output "cloudfront_domain" {
  description = "CloudFront domain serving HLS output"
  value       = module.cloudfront.distribution_domain
}

output "cloudfront_key_pair_id" {
  description = "Set this as CLOUDFRONT_KEYPAIR_ID in the user API"
  value       = module.cloudfront.public_key_id
}

output "raw_bucket" {
  value = module.s3.raw_bucket_id
}

output "hls_bucket" {
  value = module.s3.hls_bucket_id
}

output "worker_ecr_repo" {
  description = "Push the transcode worker image here"
  value       = module.ecr.repository_url
}

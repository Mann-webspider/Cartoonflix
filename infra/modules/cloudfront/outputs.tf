output "distribution_domain" {
  value = aws_cloudfront_distribution.hls.domain_name
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.hls.arn
}

output "key_group_id" {
  value = aws_cloudfront_key_group.signing.id
}

output "public_key_id" {
  description = "Use as CLOUDFRONT_KEYPAIR_ID when signing URLs"
  value       = aws_cloudfront_public_key.signing.id
}

locals {
  origin_id = "${var.project}-hls-origin"
}

# Origin Access Control — CloudFront reads the private HLS bucket.
resource "aws_cloudfront_origin_access_control" "hls" {
  name                              = "${var.project}-hls-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Public key + key group used to verify signed URLs.
resource "aws_cloudfront_public_key" "signing" {
  name        = "${var.project}-signing-key"
  encoded_key = var.public_key_pem
  comment     = "CartoonFlix signed-URL verification key"
}

resource "aws_cloudfront_key_group" "signing" {
  name  = "${var.project}-signing-group"
  items = [aws_cloudfront_public_key.signing.id]
}

resource "aws_cloudfront_distribution" "hls" {
  enabled             = true
  comment             = "${var.project} HLS delivery"
  default_root_object = ""
  price_class         = "PriceClass_100"

  origin {
    domain_name              = var.hls_bucket_domain_name
    origin_id                = local.origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.hls.id
  }

  default_cache_behavior {
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    # Require signed URLs.
    trusted_key_groups = [aws_cloudfront_key_group.signing.id]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Posters / thumbnails are public (no signing) so <img> tags load directly.
  ordered_cache_behavior {
    path_pattern           = "posters/*"
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 604800
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Let this distribution read the HLS bucket.
resource "aws_s3_bucket_policy" "hls_oac" {
  bucket = var.hls_bucket_id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${var.hls_bucket_arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.hls.arn
        }
      }
    }]
  })
}

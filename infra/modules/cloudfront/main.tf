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

# The player fetches segments and WebVTT tracks with XHR/fetch from the app's
# own origin, so those responses need CORS headers. Without this the captions
# menu is populated but every track fails to load.
resource "aws_cloudfront_response_headers_policy" "media" {
  name = "${var.project}-media-cors"

  cors_config {
    access_control_allow_credentials = false
    origin_override                  = true

    access_control_allow_headers {
      items = ["*"]
    }
    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }
    access_control_allow_origins {
      items = var.allowed_origins
    }
    access_control_max_age_sec = 3000
  }
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

  # HLS output, WebVTT tracks and the master playlist.
  #
  # Deliberately NOT signed. A signed URL only covers the one object it signs,
  # and an HLS stream is hundreds of separate segment requests, so signing the
  # master playlist leaves every segment returning 403. Signed *cookies* are the
  # correct mechanism, and they need a custom domain so the app on Vercel and
  # this distribution can share a parent-domain cookie. The key group and public
  # key below are kept for exactly that upgrade.
  default_cache_behavior {
    target_origin_id           = local.origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    response_headers_policy_id = aws_cloudfront_response_headers_policy.media.id

    forwarded_values {
      query_string = false
      # Origin is forwarded so CloudFront caches the right CORS response per
      # requesting origin instead of serving one origin's headers to all.
      headers = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Artwork is immutable once published (the key carries a timestamp), so it
  # gets a much longer TTL than the playlists.
  ordered_cache_behavior {
    path_pattern               = "posters/*"
    target_origin_id           = local.origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    response_headers_policy_id = aws_cloudfront_response_headers_policy.media.id

    forwarded_values {
      query_string = false
      headers      = ["Origin"]
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

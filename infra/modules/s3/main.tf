# Raw uploads bucket — presigned PUT target, emits events to EventBridge.
resource "aws_s3_bucket" "raw" {
  bucket = "${var.project}-raw"
}

resource "aws_s3_bucket_public_access_block" "raw" {
  bucket                  = aws_s3_bucket.raw.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Browser uploads via presigned PUT need CORS.
resource "aws_s3_bucket_cors_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id
  cors_rule {
    allowed_methods = ["PUT"]
    allowed_origins = ["*"] # tighten to your app origins in production
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id
  rule {
    id     = "expire-raw"
    status = "Enabled"
    filter {} # applies to all objects
    expiration {
      days = var.raw_retention_days
    }
  }
}

# Route S3 events through EventBridge (decouples from the transcode trigger).
resource "aws_s3_bucket_notification" "raw" {
  bucket      = aws_s3_bucket.raw.id
  eventbridge = true
}

# HLS output bucket — private, read only via CloudFront OAC.
resource "aws_s3_bucket" "hls" {
  bucket = "${var.project}-hls"
}

resource "aws_s3_bucket_public_access_block" "hls" {
  bucket                  = aws_s3_bucket.hls.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "hls" {
  bucket = aws_s3_bucket.hls.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront serves this bucket and attaches its own CORS headers, but the
# origin must allow the request for CloudFront to have anything to forward.
resource "aws_s3_bucket_cors_configuration" "hls" {
  bucket = aws_s3_bucket.hls.id
  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    expose_headers  = ["Content-Length", "Content-Range", "Content-Type"]
    max_age_seconds = 3000
  }
}

locals {
  # One row of Lambda widgets (invocations, errors, duration) per function.
  lambda_widgets = [
    for i, fn in var.function_names : {
      type   = "metric"
      x      = 0
      y      = i * 6
      width  = 18
      height = 6
      properties = {
        title  = fn
        region = var.aws_region
        view   = "timeSeries"
        metrics = [
          ["AWS/Lambda", "Invocations", "FunctionName", fn, { stat = "Sum" }],
          ["AWS/Lambda", "Errors", "FunctionName", fn, { stat = "Sum" }],
          ["AWS/Lambda", "Duration", "FunctionName", fn, { stat = "Average" }],
        ]
      }
    }
  ]

  queue_widget = {
    type   = "metric"
    x      = 0
    y      = length(var.function_names) * 6
    width  = 18
    height = 6
    properties = {
      title  = "Transcode queue depth"
      region = var.aws_region
      view   = "timeSeries"
      metrics = [
        ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", var.queue_name, { stat = "Maximum", label = "queued" }],
        ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", var.dlq_name, { stat = "Maximum", label = "dead-letter" }],
      ]
    }
  }
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-overview"
  dashboard_body = jsonencode({
    widgets = concat(local.lambda_widgets, [local.queue_widget])
  })
}

# Alarm when transcode jobs land in the dead-letter queue.
resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  alarm_name          = "${var.project}-transcode-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Transcode jobs failed and were dead-lettered"
  treat_missing_data  = "notBreaching"
  dimensions = {
    QueueName = var.dlq_name
  }
}

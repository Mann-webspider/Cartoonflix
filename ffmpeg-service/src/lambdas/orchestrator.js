import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";

const ecs = new ECSClient({ region: process.env.AWS_REGION });

/**
 * SQS -> ecs RunTask. Each SQS record wraps an EventBridge "Object Created"
 * event for the raw bucket. We derive the contentId from the key convention
 * `<contentId>/<filename>` and launch one ephemeral Fargate task per upload.
 */
export const handler = async (event) => {
  for (const record of event.Records ?? []) {
    const body = JSON.parse(record.body);
    const detail = body.detail ?? {};
    const key = detail.object?.key;
    const bucket = detail.bucket?.name;
    if (!key || !bucket) {
      console.warn("Skipping record without bucket/key", record.body);
      continue;
    }

    const contentId = decodeURIComponent(key).split("/")[0];
    console.log(`Launching transcode task for content ${contentId} (${key})`);

    await ecs.send(new RunTaskCommand({
      cluster: process.env.CLUSTER_ARN,
      taskDefinition: process.env.TASK_DEF_ARN,
      launchType: "FARGATE",
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: process.env.SUBNETS.split(","),
          securityGroups: [process.env.SECURITY_GROUP],
          assignPublicIp: "ENABLED",
        },
      },
      overrides: {
        containerOverrides: [{
          name: process.env.CONTAINER_NAME,
          environment: [
            { name: "RAW_KEY", value: key },
            { name: "CONTENT_ID", value: contentId },
          ],
        }],
      },
    }));
  }
};

import { S3Client } from "@aws-sdk/client-s3";

/**
 * Shared S3 client. In AWS (Fargate task role / Lambda role) credentials come
 * from the default provider chain — no keys in code. For local runs the
 * standard AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars are picked up
 * automatically by the SDK.
 */
export const s3 = new S3Client({ region: process.env.AWS_REGION });

import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

/**
 * How long a single request may take before it is abandoned.
 *
 * Fifteen seconds was wrong, and wrong in the direction that breaks things:
 * it was chosen to fire before S3 gives up on an idle socket at about twenty,
 * but this connection produces requests that legitimately run far longer than
 * that. Measured over thirty segments, the median took two seconds and the
 * slowest took sixty-six — so the timeout was killing healthy uploads and
 * reporting it as "Connection timed out after 15000 ms".
 *
 * Five minutes is the value of a socket that is genuinely dead rather than
 * merely slow. S3 answers a stalled request itself long before this, and that
 * answer is retried; this only catches a connection that has stopped
 * existing without saying so.
 */
const REQUEST_TIMEOUT_MS = 300_000;
const CONNECTION_TIMEOUT_MS = 10_000;

/**
 * Shared S3 client. In AWS (Fargate task role / Lambda role) credentials come
 * from the default provider chain — no keys in code. Locally the same chain
 * reads the AWS CLI profile, which is why no keys belong in a .env file either.
 */
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // Above the SDK's default of three: the failures being retried here are
  // transient stalls on a home line, and the next attempt usually works.
  maxAttempts: 5,
  requestHandler: new NodeHttpHandler({
    requestTimeout: REQUEST_TIMEOUT_MS,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
  }),
});

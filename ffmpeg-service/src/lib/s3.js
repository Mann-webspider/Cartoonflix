import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

/**
 * A stalled request is abandoned well before S3 would abandon it.
 *
 * Publishing a film is thousands of uploads over the better part of an hour on
 * a domestic connection, and that connection stalls occasionally: measured over
 * one batch of segments, half completed in about a second and one took twenty
 * one. S3 stops waiting at roughly twenty seconds and answers "your socket
 * connection to the server was not read from or written to within the timeout
 * period" — so on a long enough publish, one unlucky segment ends the whole
 * thing.
 *
 * Fifteen seconds is comfortably below where S3 gives up and roughly nine times
 * the slowest ordinary request, so a healthy upload is never cut short; a stuck
 * one is dropped and retried on a fresh connection instead of waiting to be
 * refused.
 */
const REQUEST_TIMEOUT_MS = 15_000;
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

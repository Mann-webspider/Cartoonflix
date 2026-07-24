const { NodeHttp2Handler } = require("@aws-sdk/node-http-handler");
const { S3Client } = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttp2Handler({
    connectionTimeout: 30000, // Timeout in ms
    maxConcurrentStreams: 50, // Reduce concurrency if too high
  }),
});

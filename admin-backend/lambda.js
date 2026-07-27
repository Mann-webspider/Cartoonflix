// Lambda entrypoint — wraps the Express app with serverless-http behind API Gateway.
const serverless = require('serverless-http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const wrapped = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false; // reuse the Mongo pool across invocations
  await connectDB();
  return wrapped(event, context);
};

import { MongoClient } from "mongodb";
import { getSecret } from "./secrets.js";

let client;

/**
 * Lazily connect to MongoDB. The connection string is read from Secrets Manager
 * (MONGO_SECRET_ARN) in the cloud, or MONGO_URI directly for local runs.
 * The client is cached so warm Lambda invocations reuse the pool.
 */
export const getDb = async () => {
  if (client) return client.db();

  const uri = process.env.MONGO_SECRET_ARN
    ? await getSecret(process.env.MONGO_SECRET_ARN)
    : process.env.MONGO_URI;

  if (!uri) throw new Error("No Mongo connection string (MONGO_SECRET_ARN / MONGO_URI)");

  client = new MongoClient(uri);
  await client.connect();
  return client.db();
};

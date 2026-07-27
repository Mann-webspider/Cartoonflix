import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
const cache = new Map();

/**
 * Fetch a secret string by ARN, cached for the life of the process/container.
 */
export const getSecret = async (arn) => {
  if (!arn) throw new Error("getSecret: missing secret ARN");
  if (cache.has(arn)) return cache.get(arn);

  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  const value = res.SecretString ?? "";
  cache.set(arn, value);
  return value;
};

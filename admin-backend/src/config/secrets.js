const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
const cache = new Map();

// Fetch a secret string by ARN, cached for the process lifetime.
async function getSecret(arn) {
  if (!arn) throw new Error("getSecret: missing ARN");
  if (cache.has(arn)) return cache.get(arn);
  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  cache.set(arn, res.SecretString || "");
  return res.SecretString || "";
}

module.exports = { getSecret };

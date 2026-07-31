const { getSecret } = require("./secrets");

let jwtSecret;

// JWT signing secret — from Secrets Manager (JWT_SECRET_ARN) in the cloud,
// or JWT_SECRET directly for local dev. Cached after first load.
async function getJwtSecret() {
  if (jwtSecret) return jwtSecret;
  jwtSecret = process.env.JWT_SECRET_ARN
    ? await getSecret(process.env.JWT_SECRET_ARN)
    : process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("No JWT secret (JWT_SECRET_ARN / JWT_SECRET)");
  return jwtSecret;
}

module.exports = { getJwtSecret };

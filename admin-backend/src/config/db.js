const mongoose = require("mongoose");
const { getSecret } = require("./secrets");

let connPromise;

// Connect once and reuse across warm Lambda invocations / the local server.
// URI comes from Secrets Manager (MONGO_SECRET_ARN) in the cloud, or MONGO_URI locally.
async function connectDB() {
  if (connPromise) return connPromise;

  connPromise = (async () => {
    const uri = process.env.MONGO_SECRET_ARN
      ? await getSecret(process.env.MONGO_SECRET_ARN)
      : process.env.MONGO_URI;
    if (!uri) throw new Error("No Mongo connection string (MONGO_SECRET_ARN / MONGO_URI)");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    return mongoose.connection;
  })();

  return connPromise;
}

module.exports = { connectDB };

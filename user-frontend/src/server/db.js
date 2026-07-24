import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI || "mongodb+srv://maandalsania11:O2LqlEWoRofbYowQ@cartoonflix.4xurqhb.mongodb.net/streaming-platform?retryWrites=true&w=majority&appName=cartoonflix"; // Ensure this is set in .env
console.log(MONGODB_URI);

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env file");
}

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("🔥 Already connected to MongoDB");
      return;
    }

    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected!");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}
await connectDB();
export default connectDB;

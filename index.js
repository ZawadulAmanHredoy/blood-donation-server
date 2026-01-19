// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./user.routes.js";
import requestRoutes from "./request.routes.js";
import fundingRoutes from "./funding.routes.js";
import statsRoutes from "./routes/stats.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/funding", fundingRoutes);
app.use("/api/stats", statsRoutes);

// Root test
app.get("/", (req, res) => {
  res.send("Blood Donation Server is running");
});

// --- Mongo connection caching for serverless ---
let cached = global.__mongoose_cache;
if (!cached) {
  cached = global.__mongoose_cache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // keeps behavior stable in serverless
        bufferCommands: false,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Vercel Serverless handler (required)
export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error("Server handler error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

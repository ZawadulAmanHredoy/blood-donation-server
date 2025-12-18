import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";     // ✅ in /routes
import userRoutes from "./user.routes.js";            // ✅ in root
import requestRoutes from "./request.routes.js";      // ✅ in root
import fundingRoutes from "./funding.routes.js";      // ✅ in root
import statsRoutes from "./routes/stats.routes.js";   // ✅ in /routes

dotenv.config();

const app = express();

/**
 * ✅ CORS Setup
 * - Fixes: "No Access-Control-Allow-Origin header"
 * - Fixes: preflight issues (OPTIONS)
 * - Allows: localhost + your Firebase domains
 */
const allowedOrigins = [
  "http://localhost:5173",
  "https://blood-donation-app11189.web.app",
  "https://blood-donation-app11189.firebaseapp.com",
];

// If you set CLIENT_URL in env, allow it too
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Ensure preflight works for all routes
app.options("*", cors());

app.use(express.json());

/**
 * ✅ MongoDB Connection (serverless-safe)
 * - Prevents reconnecting on every request
 */
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  await mongoose.connect(uri);
  isConnected = true;
  console.log("✅ MongoDB connected");
}

/**
 * ✅ Only connect DB for API routes
 * (so "/" doesn't crash if DB is temporarily down)
 */
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/funding", fundingRoutes);
app.use("/api/stats", statsRoutes);

// ✅ root test
app.get("/", (req, res) => {
  res.send("Blood Donation Server is running");
});

/**
 * ✅ Local dev only (Vercel will ignore app.listen)
 */
const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// ✅ IMPORTANT for Vercel serverless
export default app;

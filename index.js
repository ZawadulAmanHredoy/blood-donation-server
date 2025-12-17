import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";     // ✅ exists in /routes
import userRoutes from "./user.routes.js";            // ✅ exists in root
import requestRoutes from "./request.routes.js";      // ✅ exists in root
import fundingRoutes from "./funding.routes.js";      // ✅ exists in root
import statsRoutes from "./routes/stats.routes.js";   // ✅ we created in /routes

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

// root test
app.get("/", (req, res) => {
  res.send("Blood Donation Server is running");
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
  });

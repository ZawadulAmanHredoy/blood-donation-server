import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

const port = process.env.PORT || 5000;

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err));

// Test route
app.get("/", (req, res) => {
  res.send("Blood Donation API is running");
});

// Auth routes
app.use("/api/auth", authRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

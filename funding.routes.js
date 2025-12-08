// server/funding.routes.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

import verifyJWT from "./middleware/verifyJWT.js";
import { requireRole } from "./roleMiddleware.js";
import Funding from "./models/Funding.js";
import User from "./models/User.js";

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠️ STRIPE_SECRET_KEY is not set in .env. Funding payment will not work.");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const router = express.Router();

// helper for pagination
const buildPagination = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// 🧾 Create Stripe Payment Intent
// POST /api/funding/create-payment-intent
router.post("/create-payment-intent", verifyJWT, async (req, res) => {
  try {
    if (!stripe) {
      return res
        .status(500)
        .json({ message: "Stripe is not configured on the server" });
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Stripe expects amount in the smallest currency unit (e.g. cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd", // change if you want another currency and Stripe supports it
      metadata: {
        userId: req.user.id,
        email: req.user.email,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe payment intent error:", error);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
});

// 💾 Record a successful funding (call this from frontend after successful Stripe payment)
// POST /api/funding/record
router.post("/record", verifyJWT, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const user = await User.findById(req.user.id).select("name email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const funding = await Funding.create({
      user: req.user.id,
      name: user.name,
      email: user.email,
      amount,
    });

    res.status(201).json(funding);
  } catch (error) {
    console.error("Record funding error:", error);
    res.status(500).json({ message: "Failed to record funding" });
  }
});

// 📋 Get current user's funds (for Funding Page table if you want per-user)
// GET /api/funding/my
router.get("/my", verifyJWT, async (req, res) => {
  try {
    const { page, limit, skip } = buildPagination(req);

    const filter = { user: req.user.id };

    const [items, total] = await Promise.all([
      Funding.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Funding.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get my funding error:", error);
    res.status(500).json({ message: "Failed to load funding data" });
  }
});

// 📋 Get all funds (Admin + Volunteer) – for dashboard stats & funding page
// GET /api/funding/all
router.get("/all", verifyJWT, requireRole("admin", "volunteer"), async (req, res) => {
  try {
    const { page, limit, skip } = buildPagination(req);

    const [items, total] = await Promise.all([
      Funding.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Funding.countDocuments(),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get all funding error:", error);
    res.status(500).json({ message: "Failed to load all funding data" });
  }
});

// 🔢 Total funds (Admin + Volunteer) – for dashboard stats card
// GET /api/funding/total
router.get("/total", verifyJWT, requireRole("admin", "volunteer"), async (req, res) => {
  try {
    const result = await Funding.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalAmount = result.length > 0 ? result[0].totalAmount : 0;

    res.json({ totalAmount });
  } catch (error) {
    console.error("Get total funding error:", error);
    res.status(500).json({ message: "Failed to calculate total funding" });
  }
});

export default router;

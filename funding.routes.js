// server/funding.routes.js
import express from "express";
import Stripe from "stripe";
import verifyJWT from "./middleware/verifyJWT.js";
import Funding from "./models/Funding.js";
import User from "./models/User.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─────────────────────────────────────────────
// GET /api/funding
// PUBLIC: list all funding records
// (used by FundingPage to show total funds)
// ─────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const funds = await Funding.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(funds);
  } catch (err) {
    console.error("GET /api/funding error:", err);
    res.status(500).json({ message: "Failed to load funding data." });
  }
});

// ─────────────────────────────────────────────
// POST /api/funding/create-payment-intent
// PROTECTED: user must be logged in
// ─────────────────────────────────────────────
router.post("/create-payment-intent", verifyJWT, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    // Stripe expects smallest unit (cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "usd", // Stripe test mode; BDT isn't supported directly
      metadata: {
        userId: req.user.id,
        email: req.user.email,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("POST /create-payment-intent error:", err);
    res.status(500).json({ message: "Failed to create payment intent." });
  }
});

// ─────────────────────────────────────────────
// POST /api/funding/confirm
// PROTECTED: save funding record after payment
// ─────────────────────────────────────────────
router.post("/confirm", verifyJWT, async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId || !amount) {
      return res.status(400).json({ message: "Missing data." });
    }

    const user = await User.findById(req.user.id);

    const fund = await Funding.create({
      user: user._id,
      name: user.name,
      email: user.email,
      amount,
      currency: "bdt",
      paymentIntentId,
      status: "succeeded",
    });

    res.json(fund);
  } catch (err) {
    console.error("POST /confirm error:", err);
    res.status(500).json({ message: "Failed to save funding record." });
  }
});

export default router;

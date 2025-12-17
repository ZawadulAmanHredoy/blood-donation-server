// server/funding.routes.js
import express from "express";
import Stripe from "stripe";
import verifyJWT from "./middleware/verifyJWT.js";
import Funding from "./models/Funding.js";

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_")) {
  console.warn("⚠️ STRIPE_SECRET_KEY missing/invalid in server/.env (must start with sk_)");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// list all
router.get("/", async (req, res) => {
  try {
    const funds = await Funding.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json(funds);
  } catch (err) {
    console.error("GET /api/funding error:", err);
    res.status(500).json({ message: "Failed to load funds." });
  }
});

// create checkout session
router.post("/create-checkout-session", verifyJWT, async (req, res) => {
  try {
    const numericAmount = Number(req.body.amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const unitAmount = Math.round(numericAmount * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: { name: "Donation Funding" },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${CLIENT_URL}/dashboard/funding?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/dashboard/funding?canceled=1`,
      metadata: {
        userId: req.user.id,
        email: req.user.email,
        amount: String(numericAmount),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("POST /create-checkout-session error:", err);
    res.status(500).json({
      message: "Failed to create checkout session.",
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

// verify + save (idempotent)
router.post("/verify-checkout-session", verifyJWT, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId required." });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed." });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) return res.status(400).json({ message: "Missing payment intent id." });

    const existing = await Funding.findOne({ paymentIntentId });
    if (existing) return res.json(existing);

    const amount = Number(session.metadata?.amount || 0);

    const fund = await Funding.create({
      user: req.user.id,
      amount,
      currency: "bdt",
      paymentIntentId,
      status: "succeeded",
    });

    res.json(fund);
  } catch (err) {
    console.error("POST /verify-checkout-session error:", err);
    res.status(500).json({
      message: "Failed to verify payment.",
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

export default router;

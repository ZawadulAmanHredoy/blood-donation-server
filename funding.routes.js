// server/funding.routes.js
import express from "express";
import Funding from "./models/Funding.js";
import verifyJWT from "./middleware/verifyJWT.js";

const router = express.Router();

function makeDummyPaymentIntentId() {
  // create something like: dummy_pi_1700000000000_ab12cd34
  const rand = Math.random().toString(16).slice(2, 10);
  return `dummy_pi_${Date.now()}_${rand}`;
}

/**
 * DUMMY PAYMENT (NO STRIPE, NO CARD)
 * POST /api/funding/dummy-pay
 * Body: { amount: number }
 */
router.post("/dummy-pay", verifyJWT, async (req, res) => {
  try {
    const { amount } = req.body;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const fund = await Funding.create({
      user: req.user.id,
      amount: numericAmount,

      // ✅ required by your schema
      paymentIntentId: makeDummyPaymentIntentId(),

      // optional fields (safe even if schema doesn't include them)
      status: "success",
    });

    return res.status(201).json({
      message: "Dummy payment successful",
      fund,
    });
  } catch (err) {
    console.error("Dummy payment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET ALL FUNDS
 * GET /api/funding
 */
router.get("/", verifyJWT, async (req, res) => {
  try {
    const funds = await Funding.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(funds);
  } catch (err) {
    console.error("Get funds error:", err);
    res.status(500).json({ message: "Failed to load funds" });
  }
});

export default router;

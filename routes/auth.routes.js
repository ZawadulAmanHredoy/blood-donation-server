// server/routes/request.routes.js
import express from "express";
import verifyJWT from "../middleware/verifyJWT.js";
import DonationRequest from "../models/DonationRequest.js";

const router = express.Router();

// ─────────────────────────────────────────────
// Get requests assigned to logged-in volunteer
// GET /api/requests/volunteer/my
// ─────────────────────────────────────────────
router.get("/volunteer/my", verifyJWT, async (req, res) => {
  try {
    const volunteerId = req.user.id;

    const requests = await DonationRequest.find({
      "donor.user": volunteerId,
    })
      .populate("requester.user", "name email avatar")
      .populate("donor.user", "name email avatar")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load requests" });
  }
});

export default router;

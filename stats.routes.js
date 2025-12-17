// server/stats.routes.js
import express from "express";
import verifyJWT from "./middleware/verifyJWT.js";
import { requireRole } from "./roleMiddleware.js";

import User from "./models/User.js";
import DonationRequest from "./models/DonationRequest.js";
import Funding from "./models/Funding.js";

const router = express.Router();

/**
 * GET /api/stats/summary
 * Admin + Volunteer only
 * Returns total funds + request counts + users count
 */
router.get(
  "/summary",
  verifyJWT,
  requireRole("admin", "volunteer"),
  async (req, res) => {
    try {
      const [totalUsers, pendingRequests, inProgressRequests, doneRequests] =
        await Promise.all([
          User.countDocuments(),
          DonationRequest.countDocuments({ status: "pending" }),
          DonationRequest.countDocuments({ status: "inprogress" }),
          DonationRequest.countDocuments({ status: "done" }),
        ]);

      const fundingAgg = await Funding.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const totalFunds = fundingAgg?.[0]?.total || 0;

      return res.json({
        totalUsers,
        requests: {
          pending: pendingRequests,
          inprogress: inProgressRequests,
          done: doneRequests,
        },
        totalFunds,
      });
    } catch (err) {
      console.error("Stats summary error:", err);
      return res.status(500).json({ message: "Failed to load stats summary." });
    }
  }
);

export default router;

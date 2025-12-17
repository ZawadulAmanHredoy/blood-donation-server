// server/routes/stats.routes.js
import express from "express";
import DonationRequest from "../models/DonationRequest.js";
import verifyJWT from "../middleware/verifyJWT.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

/**
 * GET /api/stats/requests
 * Admin + Volunteer only
 * Returns daily / weekly / monthly request counts
 */
router.get(
  "/requests",
  verifyJWT,
  roleMiddleware("admin", "volunteer"),
  async (req, res) => {
    try {
      const data = await DonationRequest.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);

      // format for charts
      const daily = data.map((d) => ({
        label: `${d._id.day}/${d._id.month}`,
        value: d.count,
      }));

      const monthlyMap = {};
      data.forEach((d) => {
        const key = `${d._id.month}/${d._id.year}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + d.count;
      });

      const monthly = Object.entries(monthlyMap).map(([label, value]) => ({
        label,
        value,
      }));

      res.json({
        daily,
        monthly,
      });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ message: "Failed to load statistics" });
    }
  }
);

export default router;

// server/routes/stats.routes.js
import express from "express";
import DonationRequest from "../models/DonationRequest.js";
import verifyJWT from "../middleware/verifyJWT.js";
import { requireRole } from "../roleMiddleware.js"; // ✅ correct path + named export

const router = express.Router();

/**
 * GET /api/stats/requests
 * Admin + Volunteer only
 * Returns daily / weekly / monthly request counts
 */
router.get(
  "/requests",
  verifyJWT,
  requireRole("admin", "volunteer"),
  async (req, res) => {
    try {
      // Daily stats (last 30 days)
      const daily = await DonationRequest.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            value: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        {
          $project: {
            _id: 0,
            label: {
              $concat: [
                { $toString: "$_id.day" },
                "/",
                { $toString: "$_id.month" },
              ],
            },
            value: 1,
          },
        },
      ]);

      // Monthly stats (last 12 months)
      const monthly = await DonationRequest.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            value: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            label: {
              $concat: [
                { $toString: "$_id.month" },
                "/",
                { $toString: "$_id.year" },
              ],
            },
            value: 1,
          },
        },
      ]);

      // Weekly stats (last 12 weeks)
      const weekly = await DonationRequest.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $isoWeekYear: "$createdAt" },
              week: { $isoWeek: "$createdAt" },
            },
            value: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } },
        {
          $project: {
            _id: 0,
            label: {
              $concat: [
                "W",
                { $toString: "$_id.week" },
                " ",
                { $toString: "$_id.year" },
              ],
            },
            value: 1,
          },
        },
      ]);

      res.json({ daily, weekly, monthly });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ message: "Failed to load statistics" });
    }
  }
);

export default router;

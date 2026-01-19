// server/routes/stats.routes.js

import express from "express";
import DonationRequest from "../models/DonationRequest.js";
import Funding from "../models/Funding.js";
import User from "../models/User.js";
import verifyJWT from "../middleware/verifyJWT.js";
import { requireRole } from "../roleMiddleware.js";

const router = express.Router();

/**
 * GET /api/stats/summary
 * Admin + Volunteer only
 * Summary for dashboard cards
 */
router.get(
  "/summary",
  verifyJWT,
  requireRole("admin", "volunteer"),
  async (req, res) => {
    try {
      const [totalUsers, fundsAgg, reqAgg] = await Promise.all([
        User.countDocuments(),
        Funding.aggregate([
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        DonationRequest.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const totalFunds = fundsAgg?.[0]?.total || 0;

      const requests = {
        pending: 0,
        inprogress: 0,
        done: 0,
        canceled: 0,
      };

      for (const r of reqAgg) {
        if (requests[r._id] !== undefined) requests[r._id] = r.count;
      }

      return res.json({
        totalUsers,
        totalFunds,
        requests: {
          ...requests,
          total: Object.values(requests).reduce((a, b) => a + b, 0),
        },
      });
    } catch (err) {
      console.error("Stats summary error:", err);
      return res
        .status(500)
        .json({ message: "Failed to load dashboard summary" });
    }
  }
);

/**
 * GET /api/stats/requests
 * Admin + Volunteer only
 * Daily / Weekly / Monthly request counts
 */
router.get(
  "/requests",
  verifyJWT,
  requireRole("admin", "volunteer"),
  async (req, res) => {
    try {
      const now = Date.now();

      // Daily (last 30 days)
      const daily = await DonationRequest.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
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

      // Weekly (last 12 weeks)
      const weekly = await DonationRequest.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now - 12 * 7 * 24 * 60 * 60 * 1000) },
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

      // Monthly (last 12 months)
      const monthly = await DonationRequest.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) },
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

      return res.json({ daily, weekly, monthly });
    } catch (err) {
      console.error("Stats requests error:", err);
      return res.status(500).json({ message: "Failed to load statistics" });
    }
  }
);

export default router;

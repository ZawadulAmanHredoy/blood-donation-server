// server/routes/public.routes.js

import express from "express";
import DonationRequest from "../models/DonationRequest.js";

const router = express.Router();

/**
 * GET /api/public/requests/:id
 * Publicly accessible request details (only if isPublic === true)
 */
router.get("/requests/:id", async (req, res) => {
  try {
    const request = await DonationRequest.findById(req.params.id).lean();

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    if (!request.isPublic) {
      return res.status(403).json({ message: "This request is not public." });
    }

    // Remove sensitive info if present
    if (request.requester) {
      delete request.requester.email;
      delete request.requester.user;
    }
    if (request.donor) {
      delete request.donor.email;
      delete request.donor.user;
    }

    return res.json(request);
  } catch (err) {
    console.error("Public request details error:", err);
    return res.status(500).json({ message: "Failed to load public request." });
  }
});

export default router;

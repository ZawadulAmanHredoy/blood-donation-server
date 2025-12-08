// server/request.routes.js
import express from "express";
import verifyJWT from "./middleware/verifyJWT.js";
import DonationRequest from "./models/DonationRequest.js";
import User from "./models/User.js";

const router = express.Router();

// Helpers for pagination
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, parseInt(query.limit) || 10);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ─────────────────────────────────────────────
// POST /api/requests
// Create a new donation request (logged-in user)
// ─────────────────────────────────────────────
router.post("/", verifyJWT, async (req, res) => {
  try {
    const {
      recipientName,
      recipientDistrict,
      recipientUpazila,
      hospitalName,
      fullAddress,
      bloodGroup,
      donationDate,
      donationTime,
      requestMessage,
    } = req.body;

    if (
      !recipientName ||
      !recipientDistrict ||
      !recipientUpazila ||
      !hospitalName ||
      !fullAddress ||
      !bloodGroup ||
      !donationDate ||
      !donationTime
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (user.status === "blocked") {
      return res
        .status(403)
        .json({ message: "Blocked users cannot create requests." });
    }

    const doc = await DonationRequest.create({
      recipient: {
        name: recipientName,
        district: recipientDistrict,
        upazila: recipientUpazila,
      },
      hospitalName,
      fullAddress,
      bloodGroup,
      donationDate,
      donationTime,
      requestMessage,
      status: "pending",
      isPublic: true,
      requester: {
        user: user._id,
        name: user.name,
        email: user.email,
        district: user.district,
        upazila: user.upazila,
        bloodGroup: user.bloodGroup,
      },
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ message: "Failed to create request." });
  }
});

// ─────────────────────────────────────────────
// GET /api/requests/my
// Logged-in user's own requests (as requester)
// ─────────────────────────────────────────────
router.get("/my", verifyJWT, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      "requester.user": req.user.id,
    };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      DonationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DonationRequest.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      items,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error("Get my requests error:", err);
    res.status(500).json({ message: "Failed to load requests." });
  }
});

// ─────────────────────────────────────────────
// GET /api/requests/volunteer/my
// Requests assigned to logged-in volunteer (as donor)
// ─────────────────────────────────────────────
router.get("/volunteer/my", verifyJWT, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      "donor.user": req.user.id,
    };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      DonationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DonationRequest.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      items,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error("Get volunteer requests error:", err);
    res
      .status(500)
      .json({ message: "Failed to load volunteer requests." });
  }
});

// ─────────────────────────────────────────────
// GET /api/requests/all
// Admin: get all requests (with optional status)
// ─────────────────────────────────────────────
router.get("/all", verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      DonationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DonationRequest.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      items,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error("Admin get all requests error:", err);
    res.status(500).json({ message: "Failed to load requests." });
  }
});

// ─────────────────────────────────────────────
// GET /api/requests/pending-public
// Public: pending & public requests
// ─────────────────────────────────────────────
router.get("/pending-public", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      status: "pending",
      isPublic: true,
    };

    const [items, total] = await Promise.all([
      DonationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DonationRequest.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      items,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error("Public pending requests error:", err);
    res.status(500).json({ message: "Failed to load public requests." });
  }
});

// ─────────────────────────────────────────────
// GET /api/requests/:id
// Get single request details
// ─────────────────────────────────────────────
router.get("/:id", verifyJWT, async (req, res) => {
  try {
    const request = await DonationRequest.findById(req.params.id)
      .populate("requester.user", "name email avatar")
      .populate("donor.user", "name email avatar");

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    res.json(request);
  } catch (err) {
    console.error("Get request by id error:", err);
    res.status(500).json({ message: "Failed to load request." });
  }
});

// ─────────────────────────────────────────────
// PUT /api/requests/:id
// Update request (owner or admin)
// ─────────────────────────────────────────────
router.put("/:id", verifyJWT, async (req, res) => {
  try {
    const request = await DonationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    const isOwner = String(request.requester.user) === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not allowed to edit this request." });
    }

    const {
      recipientName,
      recipientDistrict,
      recipientUpazila,
      hospitalName,
      fullAddress,
      bloodGroup,
      donationDate,
      donationTime,
      requestMessage,
      isPublic,
    } = req.body;

    if (recipientName) request.recipient.name = recipientName;
    if (recipientDistrict) request.recipient.district = recipientDistrict;
    if (recipientUpazila) request.recipient.upazila = recipientUpazila;
    if (hospitalName) request.hospitalName = hospitalName;
    if (fullAddress) request.fullAddress = fullAddress;
    if (bloodGroup) request.bloodGroup = bloodGroup;
    if (donationDate) request.donationDate = donationDate;
    if (donationTime) request.donationTime = donationTime;
    if (typeof requestMessage === "string")
      request.requestMessage = requestMessage;
    if (typeof isPublic === "boolean") request.isPublic = isPublic;

    await request.save();
    res.json(request);
  } catch (err) {
    console.error("Update request error:", err);
    res.status(500).json({ message: "Failed to update request." });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/requests/:id/donate
// Logged-in user accepts the request as donor
// ─────────────────────────────────────────────
router.patch("/:id/donate", verifyJWT, async (req, res) => {
  try {
    const request = await DonationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Blocked users cannot donate." });
    }

    request.donor = {
      user: user._id,
      name: user.name,
      email: user.email,
      district: user.district,
      upazila: user.upazila,
      bloodGroup: user.bloodGroup,
    };
    request.status = "inprogress";

    await request.save();
    res.json(request);
  } catch (err) {
    console.error("Donate to request error:", err);
    res.status(500).json({ message: "Failed to take request." });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/requests/:id/status
// Change status (admin OR requester OR donor)
// ─────────────────────────────────────────────
router.patch("/:id/status", verifyJWT, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "inprogress", "done", "canceled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const request = await DonationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(request.requester.user) === req.user.id;
    const isDonor =
      request.donor?.user && String(request.donor.user) === req.user.id;

    if (!isAdmin && !isOwner && !isDonor) {
      return res.status(403).json({
        message: "Not allowed to change status for this request.",
      });
    }

    request.status = status;
    await request.save();
    res.json(request);
  } catch (err) {
    console.error("Change status error:", err);
    res.status(500).json({ message: "Failed to change status." });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/requests/:id
// Delete request (admin or owner)
// ─────────────────────────────────────────────
router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const request = await DonationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    const isOwner = String(request.requester.user) === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not allowed to delete this request." });
    }

    await request.deleteOne();
    res.json({ message: "Request deleted." });
  } catch (err) {
    console.error("Delete request error:", err);
    res.status(500).json({ message: "Failed to delete request." });
  }
});

export default router;

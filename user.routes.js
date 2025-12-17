// server/user.routes.js
import express from "express";
import verifyJWT from "./middleware/verifyJWT.js";
import User from "./models/User.js";

const router = express.Router();

// Small helper for pagination (used for admin list + donor search)
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, parseInt(query.limit) || 10);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/* ─────────────────────────────────────────────
   GET /api/users/me  → get own profile
───────────────────────────────────────────── */
router.get("/me", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user);
  } catch (err) {
    console.error("GET /api/users/me error:", err);
    res.status(500).json({ message: "Failed to load profile." });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/users/me  → update own profile
───────────────────────────────────────────── */
router.patch("/me", verifyJWT, async (req, res) => {
  try {
    const allowed = [
      "name",
      "avatar",
      "bloodGroup",
      "district",
      "upazila",
      "phone",
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
    }).select("-passwordHash");

    res.json(user);
  } catch (err) {
    console.error("PATCH /api/users/me error:", err);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

/* ─────────────────────────────────────────────
   GET /api/users  → list all users (admin, paginated)
───────────────────────────────────────────── */
router.get("/", verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
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
    console.error("GET /api/users error:", err);
    res.status(500).json({ message: "Failed to load users." });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/users/:id/block  → block user (admin)
───────────────────────────────────────────── */
router.patch("/:id/block", verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "blocked" },
      { new: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json(user);
  } catch (err) {
    console.error("PATCH /users/:id/block error:", err);
    res.status(500).json({ message: "Failed to block user." });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/users/:id/unblock  → unblock user (admin)
───────────────────────────────────────────── */
router.patch("/:id/unblock", verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json(user);
  } catch (err) {
    console.error("PATCH /users/:id/unblock error:", err);
    res.status(500).json({ message: "Failed to unblock user." });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/users/:id/make-admin  → promote to admin
───────────────────────────────────────────── */
router.patch("/:id/make-admin", verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin" },
      { new: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json(user);
  } catch (err) {
    console.error("PATCH /users/:id/make-admin error:", err);
    res.status(500).json({ message: "Failed to update role." });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/users/:id/make-volunteer  → promote to volunteer
───────────────────────────────────────────── */
router.patch("/:id/make-volunteer", verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "volunteer" },
      { new: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json(user);
  } catch (err) {
    console.error("PATCH /users/:id/make-volunteer error:", err);
    res.status(500).json({ message: "Failed to update role." });
  }
});

/* ─────────────────────────────────────────────
   GET /api/users/search-donors  → public donor search (NOW PAGINATED ✅)
   Query: bloodGroup, district, upazila, page, limit
───────────────────────────────────────────── */
router.get("/search-donors", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const { bloodGroup, district, upazila } = req.query;

    const filter = {
      role: "donor",
      status: "active",
    };

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (district) filter.district = district;
    if (upazila) filter.upazila = upazila;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("name email bloodGroup district upazila avatar role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({ items, page, limit, total, totalPages });
  } catch (err) {
    console.error("GET /users/search-donors error:", err);
    res.status(500).json({ message: "Failed to search donors." });
  }
});

export default router;

// server/routes/auth.routes.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = "7d";

// Helper to create JWT
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      bloodGroup,
      district,
      upazila,
      avatar,
    } = req.body;

    if (!name || !email || !password || !bloodGroup || !district || !upazila) {
      return res
        .status(400)
        .json({ message: "Missing required fields for registration." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      avatar: avatar || "",
      bloodGroup,
      district,
      upazila,
      role: "donor",
      status: "active",
    });

    const token = createToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.status(201).json({
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong during registration." });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.status === "blocked") {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Contact administrator." });
    }

    const token = createToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.json({
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong during login." });
  }
});

export default router;

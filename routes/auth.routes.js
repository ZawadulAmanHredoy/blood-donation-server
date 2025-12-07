import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// helper to create JWT
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      avatar,
      bloodGroup,
      district,
      upazila,
    } = req.body;

    if (!name || !email || !password || !bloodGroup || !district || !upazila) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    // hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name,
      email,
      passwordHash,
      avatar: avatar || "",
      bloodGroup,
      district,
      upazila,
      // role defaults to "donor"
      // status defaults to "active"
    });

    const token = createToken(user);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bloodGroup: user.bloodGroup,
        district: user.district,
        upazila: user.upazila,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // check if blocked
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your account is blocked. Contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(user);

    res.json({
      message: "Logged in successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bloodGroup: user.bloodGroup,
        district: user.district,
        upazila: user.upazila,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;

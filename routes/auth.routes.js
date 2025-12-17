// server/routes/auth.routes.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const JWT_EXPIRES_IN = "7d";

const createToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing in server/.env");

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, bloodGroup, district, upazila, avatar } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, password required." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      bloodGroup,
      district,
      upazila,
      avatar,
      role: "donor",
      status: "active",
    });

    const token = createToken(user);

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Registration failed." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials." });

    const token = createToken(user);

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed." });
  }
});

export default router;

/* ============================================================
   CONTRA — Auth Routes
   POST /api/register
   POST /api/login
   ============================================================ */

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/* ----------------------------------------
   Helper — sign a JWT for a user
   ---------------------------------------- */
function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/* ============================================================
   POST /api/register
   Body: { name, email, password }
   ============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    /* Validate input */
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email." });
    }

    /* Check for existing user */
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    /* Hash password */
    const hashed = await bcrypt.hash(password, 10);

    /* Create user */
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashed
    });

    /* Respond with a token so the frontend can auto-login if desired */
    const token = signToken(user);

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* ============================================================
   POST /api/login
   Body: { email, password }
   ============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    /* Find user — explicitly select password since it's select:false by default */
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    /* Verify password */
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    /* Update lastLogin */
    user.lastLogin = new Date();
    await user.save();

    /* Sign token */
    const token = signToken(user);

    res.json({
      message: "Login successful.",
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
/* ============================================================
   CONTRA — Main Server
   Express + MongoDB + JWT auth
   ============================================================ */

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

/* ----------------------------------------
   Init
   ---------------------------------------- */
const app = express();
const PORT = process.env.PORT || 5000;

/* ----------------------------------------
   CORS — allow the frontend origins
   FRONTEND_URL can be a comma-separated list
   ---------------------------------------- */
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    /* Allow requests with no origin (Postman, curl, mobile apps) */
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    /* Allow any *.vercel.app during development */
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

/* ----------------------------------------
   Body parser — allow up to 3 MB for avatar uploads
   (avatars come in as base64 data URLs, roughly 33% larger than raw)
   ---------------------------------------- */
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true, limit: "3mb" }));

/* ----------------------------------------
   Routes
   ---------------------------------------- */
app.get("/", (req, res) => {
  res.json({
    message: "Login API is running.",
    service: "Contra",
    time: new Date().toISOString()
  });
});

app.use("/api", authRoutes);
app.use("/api", userRoutes);

/* ----------------------------------------
   404 fallback
   ---------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

/* ----------------------------------------
   Global error handler
   ---------------------------------------- */
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS: origin not allowed." });
  }
  res.status(500).json({ message: "Server error." });
});

/* ----------------------------------------
   Boot — connect to MongoDB, then listen
   ---------------------------------------- */
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log("============================================");
    console.log(`🚀 Contra backend running on port ${PORT}`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Allowed origins: ${allowedOrigins.join(", ") || "(none set)"}`);
    console.log("============================================");
  });
}

start();
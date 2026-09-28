/* ============================================================
   CONTRA — Auth Middleware
   Verifies JWT from Authorization header: "Bearer <token>"
   Attaches decoded user to req.user
   ============================================================ */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized — no token provided." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Not authorized — invalid or expired token." });
    }

    /* Fetch fresh user from DB (in case they were deleted / renamed) */
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Not authorized — user no longer exists." });
    }

    /* Attach user + decoded payload to request */
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Server error." });
  }
}

module.exports = { protect };
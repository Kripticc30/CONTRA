/* ============================================================
   CONTRA — User Routes (protected)
   ============================================================ */

const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ============================================================
   GET /api/profile
   ============================================================ */
router.get("/profile", protect, async (req, res) => {
  res.json({
    message: "Profile fetched.",
    user: req.user.toSafeJSON()
  });
});

/* ============================================================
   PUT /api/profile
   Body: { name?, email? }
   ============================================================ */
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = req.user;

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters." });
      }
      if (trimmed.length > 32) {
        return res.status(400).json({ message: "Name must be 32 characters or less." });
      }
      user.name = trimmed;
    }

    if (email !== undefined) {
      const lower = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
        return res.status(400).json({ message: "Please provide a valid email." });
      }
      if (lower !== user.email) {
        const exists = await User.findOne({ email: lower });
        if (exists) {
          return res.status(409).json({ message: "Email is already in use." });
        }
        user.email = lower;
      }
    }

    await user.save();

    res.json({
      message: "Profile updated.",
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* ============================================================
   PUT /api/password
   Body: { currentPassword, newPassword }
   ============================================================ */
router.put("/password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user._id).select("+password");

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* ============================================================
   PUT /api/avatar
   Body: { avatar: "data:image/png;base64,..." }
   ============================================================ */
router.put("/avatar", protect, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (avatar === undefined) {
      return res.status(400).json({ message: "Avatar field is required." });
    }

    if (avatar === "") {
      req.user.avatar = "";
      await req.user.save();
      return res.json({ message: "Avatar removed.", user: req.user.toSafeJSON() });
    }

    if (!avatar.startsWith("data:image/")) {
      return res.status(400).json({ message: "Avatar must be a valid image data URL." });
    }

    const approxBytes = avatar.length * 0.75;
    if (approxBytes > 2 * 1024 * 1024) {
      return res.status(413).json({ message: "Avatar must be under 2 MB." });
    }

    req.user.avatar = avatar;
    await req.user.save();

    res.json({ message: "Avatar updated.", user: req.user.toSafeJSON() });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* ============================================================
   DELETE /api/avatar
   ============================================================ */
router.delete("/avatar", protect, async (req, res) => {
  try {
    req.user.avatar = "";
    await req.user.save();
    res.json({ message: "Avatar removed.", user: req.user.toSafeJSON() });
  } catch (error) {
    console.error("Delete avatar error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* ============================================================
   PUT /api/settings
   Body: { region?, notifications?, preferredGames? }
   ============================================================ */
router.put("/settings", protect, async (req, res) => {
  try {
    const { region, notifications, preferredGames } = req.body;
    const user = req.user;

    if (region !== undefined) {
      user.settings.region = region;
    }

    if (notifications && typeof notifications === "object") {
      const allowed = ["matchInvites", "rankChanges", "friendRequests", "weeklyRecap"];
      allowed.forEach(key => {
        if (typeof notifications[key] === "boolean") {
          user.settings.notifications[key] = notifications[key];
        }
      });
    }

    if (Array.isArray(preferredGames)) {
      user.settings.preferredGames = preferredGames;
    }

    await user.save();

    res.json({
      message: "Settings updated.",
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* ============================================================
   POST /api/match
   Body: { game, map, result, score, eloDelta, opponent }
   Saves a completed match + updates the user's per-game rank
   ============================================================ */
router.post("/match", protect, async (req, res) => {
  try {
    const { game, map, result, score, eloDelta, opponent } = req.body;
    const user = req.user;

    /* Validate */
    if (!game || !map || !result) {
      return res.status(400).json({ message: "game, map, and result are required." });
    }
    if (!["win", "loss"].includes(result)) {
      return res.status(400).json({ message: "result must be 'win' or 'loss'." });
    }
    if (!user.ranks[game]) {
      return res.status(400).json({ message: `Unknown game: ${game}.` });
    }

    /* Compute Elo change if not provided */
    const delta = typeof eloDelta === "number"
      ? eloDelta
      : (result === "win" ? 25 : -18);

    const currentRank = user.ranks[game];
    const newElo = Math.max(0, currentRank.elo + delta);

    /* Update rank counters */
    currentRank.elo = newElo;
    currentRank.matches = (currentRank.matches || 0) + 1;
    if (result === "win") currentRank.wins = (currentRank.wins || 0) + 1;
    else currentRank.losses = (currentRank.losses || 0) + 1;

    /* Push match record */
    user.matches.push({
      game,
      map,
      result,
      score: score || "",
      eloDelta: delta,
      eloAfter: newElo,
      opponent: opponent || "",
      playedAt: new Date()
    });

    /* Keep only the latest 50 matches */
    if (user.matches.length > 50) {
      user.matches = user.matches.slice(-50);
    }

    await user.save();

    res.status(201).json({
      message: "Match recorded.",
      match: user.matches[user.matches.length - 1],
      newElo: newElo,
      rank: currentRank,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error("Record match error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* ============================================================
   GET /api/matches
   Optional query: ?game=cs2&limit=10
   ============================================================ */
router.get("/matches", protect, async (req, res) => {
  try {
    const { game, limit } = req.query;
    let matches = req.user.matches.slice().reverse(); /* newest first */

    if (game) {
      matches = matches.filter(m => m.game === game);
    }

    const max = parseInt(limit, 10);
    if (!Number.isNaN(max) && max > 0) {
      matches = matches.slice(0, max);
    }

    res.json({
      message: "Matches fetched.",
      count: matches.length,
      matches
    });
  } catch (error) {
    console.error("Fetch matches error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
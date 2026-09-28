/* ============================================================
   CONTRA — User Model
   ============================================================ */

const mongoose = require("mongoose");

/* Per-game rank sub-schema */
const gameRankSchema = new mongoose.Schema({
  elo:     { type: Number, default: 1000 },
  matches: { type: Number, default: 0 },
  wins:    { type: Number, default: 0 },
  losses:  { type: Number, default: 0 }
}, { _id: false });

/* Settings sub-schema */
const settingsSchema = new mongoose.Schema({
  region: { type: String, default: "SEA — Southeast Asia" },
  notifications: {
    matchInvites:   { type: Boolean, default: true },
    rankChanges:    { type: Boolean, default: true },
    friendRequests: { type: Boolean, default: false },
    weeklyRecap:    { type: Boolean, default: false }
  },
  preferredGames: { type: [String], default: ["cs2", "cod", "apex"] }
}, { _id: false });

/* Match record sub-schema */
const matchSchema = new mongoose.Schema({
  game:     { type: String, required: true },
  map:      { type: String, required: true },
  result:   { type: String, enum: ["win", "loss"], required: true },
  score:    { type: String, default: "" },
  eloDelta: { type: Number, default: 0 },
  eloAfter: { type: Number, default: 1000 },
  opponent: { type: String, default: "" },
  playedAt: { type: Date, default: Date.now }
}, { _id: true });

/* Main user schema */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: 32
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false
  },
  avatar: { type: String, default: "" },
  ranks: {
    cs2:      { type: gameRankSchema, default: () => ({}) },
    cs16:     { type: gameRankSchema, default: () => ({}) },
    cod:      { type: gameRankSchema, default: () => ({}) },
    apex:     { type: gameRankSchema, default: () => ({}) },
    r6:       { type: gameRankSchema, default: () => ({}) },
    halo:     { type: gameRankSchema, default: () => ({}) },
    valorant: { type: gameRankSchema, default: () => ({}) }
  },
  settings: { type: settingsSchema, default: () => ({}) },
  matches:  { type: [matchSchema], default: [] },
  lastLogin: { type: Date, default: null }
}, { timestamps: true });

/* Safe output (no password) */
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    ranks: this.ranks,
    settings: this.settings,
    matches: this.matches,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model("User", userSchema);
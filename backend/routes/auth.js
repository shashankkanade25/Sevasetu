const express  = require("express");
const jwt       = require("jsonwebtoken");
const Volunteer = require("../models/Volunteer");
const NGO       = require("../models/NGO");
const { verifyToken, JWT_SECRET } = require("../middleware/verifyToken");

const router = express.Router();

/* ─── helpers ─── */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/* ════════════════════════════════════════════════════
   GET /auth/user/:email
   Checks if a user exists in MongoDB.
════════════════════════════════════════════════════ */
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const volunteer = await Volunteer.findOne({ email });
    if (volunteer) {
      const token = signToken({ id: volunteer._id, email, role: "volunteer" });
      return res.json({ exists: true, role: "volunteer", user: volunteer, token });
    }

    const ngo = await NGO.findOne({ email });
    if (ngo) {
      const token = signToken({ id: ngo._id, email, role: "ngo" });
      return res.json({ exists: true, role: "ngo", user: ngo, token });
    }

    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ════════════════════════════════════════════════════
   POST /auth/create-user
   Saves the complete profile to MongoDB after Google OAuth.
════════════════════════════════════════════════════ */
router.post("/create-user", async (req, res) => {
  try {
    const { role, email, name, photoURL, ...rest } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "email and role are required." });
    }

    if (role === "volunteer") {
      const volunteer = await Volunteer.create({
        email,
        name,
        photoURL,
        role: "volunteer",
        skills:       rest.skills      || [],
        location:     rest.location    || "",
        availability: rest.availability ?? true,
      });
      const token = signToken({ id: volunteer._id, email, role: "volunteer" });
      return res.json({ user: volunteer, token, role: "volunteer" });
    }

    if (role === "ngo") {
      const ngo = await NGO.create({
        email,
        name,
        photoURL,
        role:          "ngo",
        organization:  rest.organization || "",
        contactPerson: rest.contactPerson || "",
        focusArea:     rest.focusArea    || "",
        location:      rest.location     || "",
      });
      const token = signToken({ id: ngo._id, email, role: "ngo" });
      return res.json({ user: ngo, token, role: "ngo" });
    }

    res.status(400).json({ error: "Invalid role." });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Account already exists." });
    }
    res.status(500).json({ error: err.message });
  }
});

/* ════════════════════════════════════════════════════
   GET /auth/me
   (Existing JWT rehydration)
════════════════════════════════════════════════════ */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const user = role === "volunteer"
      ? await Volunteer.findById(id)
      : await NGO.findById(id);

    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

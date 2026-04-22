const express  = require("express");
const jwt       = require("jsonwebtoken");
const Volunteer = require("../models/Volunteer");
const NGO       = require("../models/NGO");
const { JWT_SECRET } = require("../middleware/verifyToken");

const router = express.Router();

/* ─── helpers ─── */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/* ════════════════════════════════════════════════════
   POST /auth/signup
   Called AFTER Firebase creates the user on the client.
   Stores the MongoDB record and returns a JWT.
════════════════════════════════════════════════════ */
router.post("/signup", async (req, res) => {
  try {
    const { role, firebaseUid, email, ...rest } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "email and role are required." });
    }

    /* ── Volunteer ── */
    if (role === "volunteer") {
      let volunteer = await Volunteer.findOne({ email });

      if (!volunteer) {
        volunteer = await Volunteer.create({
          email,
          firebaseUid,
          role: "volunteer",
          name:         rest.name        || "",
          phone:        rest.phone       || "",
          location:     rest.location    || "",
          skills:       rest.skills      || [],
          availability: rest.availability ?? true,
          experience:   rest.experience  || "",
        });
      } else {
        // Update firebaseUid if it was missing (re-register)
        if (!volunteer.firebaseUid && firebaseUid) {
          volunteer.firebaseUid = firebaseUid;
          await volunteer.save();
        }
      }

      const token = signToken({ id: volunteer._id, email, role: "volunteer" });
      return res.json({ user: volunteer, token, role: "volunteer" });
    }

    /* ── NGO ── */
    if (role === "ngo") {
      let ngo = await NGO.findOne({ email });

      if (!ngo) {
        ngo = await NGO.create({
          email,
          firebaseUid,
          role:          "ngo",
          name:          rest.name          || rest.ngoName || "",
          contactPerson: rest.contactPerson || "",
          organization:  rest.organization  || rest.ngoName || "",
          focusArea:     rest.focusArea     || "",
        });
      } else {
        if (!ngo.firebaseUid && firebaseUid) {
          ngo.firebaseUid = firebaseUid;
          await ngo.save();
        }
      }

      const token = signToken({ id: ngo._id, email, role: "ngo" });
      return res.json({ user: ngo, token, role: "ngo" });
    }

    return res.status(400).json({ error: "role must be 'volunteer' or 'ngo'." });
  } catch (err) {
    // Duplicate email handled gracefully
    if (err.code === 11000) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    res.status(500).json({ error: err.message });
  }
});

/* ════════════════════════════════════════════════════
   POST /auth/login
   Called AFTER Firebase verifies credentials on the client.
   Looks up MongoDB record, validates role, returns JWT.
════════════════════════════════════════════════════ */
router.post("/login", async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) return res.status(400).json({ error: "email is required." });

    let user     = null;
    let userRole = role;

    if (role === "volunteer") {
      user = await Volunteer.findOne({ email });
    } else if (role === "ngo") {
      user = await NGO.findOne({ email });
    } else {
      // Auto-detect: try volunteer first, then NGO
      user = await Volunteer.findOne({ email });
      if (user) userRole = "volunteer";
      if (!user) {
        user = await NGO.findOne({ email });
        if (user) userRole = "ngo";
      }
    }

    if (!user) {
      return res.status(404).json({
        error: "Account not found. Please sign up first.",
      });
    }

    // Role mismatch guard
    if (role && user.role && user.role !== role) {
      return res.status(403).json({
        error: `Unauthorized: this email is registered as a ${user.role}, not ${role}.`,
      });
    }

    const token = signToken({ id: user._id, email, role: userRole });
    res.json({ user, token, role: userRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ════════════════════════════════════════════════════
   GET /auth/me
   Returns the current user's profile from MongoDB
   given a valid JWT (used to rehydrate session).
════════════════════════════════════════════════════ */
const { verifyToken } = require("../middleware/verifyToken");

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

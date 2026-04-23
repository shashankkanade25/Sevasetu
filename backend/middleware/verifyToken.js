const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sevasetu_jwt_secret_2025";

/**
 * Express middleware — verifies Bearer JWT on protected routes.
 * Attaches decoded { id, email, role } to req.user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

/**
 * Role guard factory — use after verifyToken.
 * e.g.  router.get("/secret", verifyToken, requireRole("volunteer"), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: `Access restricted to: ${roles.join(", ")}` });
    }
    next();
  };
}

const Volunteer = require("../models/Volunteer");
const NGO = require("../models/NGO");

async function verifyUserExistsInDB(req, res, next) {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: "Unauthorized. User identity missing." });
  }

  const { email, role } = req.user;
  let user = null;

  if (role === "volunteer") {
    user = await Volunteer.findOne({ email });
  } else if (role === "ngo") {
    user = await NGO.findOne({ email });
  } else {
    // Check both
    user = (await Volunteer.findOne({ email })) || (await NGO.findOne({ email }));
  }

  if (!user) {
    return res.status(404).json({ error: "User profile not found in database. Please complete registration." });
  }

  req.dbUser = user;
  next();
}

module.exports = { verifyToken, requireRole, verifyUserExistsInDB, JWT_SECRET };

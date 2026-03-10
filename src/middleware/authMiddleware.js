const jwt = require("jsonwebtoken");
const User = require("../models/User");

const parseCookieValue = (cookieHeader, key) => {
  if (!cookieHeader || typeof cookieHeader !== "string") return null;

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escapedKey}=([^;]+)`));

  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    return match[1];
  }
};

const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return parseCookieValue(req.headers.cookie, "accessToken");
};

const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized. Token missing." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized. User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized. Invalid token." });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden. Insufficient role." });
    }
    next();
  };
};

module.exports = { protect, authorize };

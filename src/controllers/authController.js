const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});



const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
const NAME_REGEX = /^[a-zA-Z .'-]+$/;

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizePhone = (phone) => {
  const trimmed = normalizeString(phone);
  if (!trimmed) return "";

  return trimmed.replace(/[\s()-]/g, "");
};

const validateRegisterPayload = ({ name, email, phone, password }) => {
  const normalizedName = normalizeString(name);
  const normalizedEmail = normalizeString(email).toLowerCase();
  const normalizedPhone = normalizePhone(phone);
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return { message: "Name, email and password are required" };
  }

  if (normalizedName.length < 2 || normalizedName.length > 50) {
    return { message: "Name must be between 2 and 50 characters" };
  }

  if (!NAME_REGEX.test(normalizedName)) {
    return { message: "Name contains invalid characters" };
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { message: "Please enter a valid email address" };
  }

  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
    return { message: "Please enter a valid phone number (10 to 15 digits)" };
  }

  if (normalizedPassword.length < 8) {
    return { message: "Password must be at least 8 characters long" };
  }

  if (/\s/.test(normalizedPassword)) {
    return { message: "Password cannot contain spaces" };
  }

  if (!/[A-Z]/.test(normalizedPassword) || !/[a-z]/.test(normalizedPassword)) {
    return { message: "Password must include at least one uppercase and one lowercase letter" };
  }

  if (!/\d/.test(normalizedPassword)) {
    return { message: "Password must include at least one number" };
  }

  return {
    normalizedName,
    normalizedEmail,
    normalizedPhone,
    normalizedPassword,
  };
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const persistRefreshToken = async (userId, token) => {
  const decoded = jwt.decode(token);

  await RefreshToken.create({
    user: userId,
    token: hashToken(token),
    expiresAt: new Date(decoded.exp * 1000),
  });
};

const issueTokens = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await persistRefreshToken(user._id, refreshToken);

  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const validationResult = validateRegisterPayload({ name, email, phone, password });
  if (validationResult.message) {
    return res.status(400).json({ message: validationResult.message });
  }

  const { normalizedName, normalizedEmail, normalizedPhone, normalizedPassword } = validationResult;

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: "Email already registered" });
  }

  if (normalizedPhone) {
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return res.status(409).json({ message: "Phone number already registered" });
    }
  }

  let finalRole = "user";

  if (role === "admin") {
    // if (!adminSecret || adminSecret !== process.env.ADMIN_REGISTER_SECRET) {
    //   return res.status(403).json({ message: "Invalid admin registration secret" });
    // }
    finalRole = "admin";
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone || undefined,
    password: normalizedPassword,
    role: finalRole,
  });

  const { accessToken, refreshToken } = await issueTokens(user);

  return res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(201)
    .json({
      message: "Registration successful",
      token: accessToken,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  return res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json({
      message: "Login successful",
      token: accessToken,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
};

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  const hashedRefreshToken = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({
    token: hashedRefreshToken,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate("user");

  if (!storedToken || !storedToken.user) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
    );

    if (String(decoded.id) !== String(storedToken.user._id)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    storedToken.revokedAt = new Date();
    await storedToken.save();

    const { accessToken, refreshToken: rotatedRefreshToken } = await issueTokens(storedToken.user);

    return res.status(200).json({
      message: "Access token refreshed",
      token: accessToken,
      accessToken,
      refreshToken: rotatedRefreshToken,
      user: buildUserResponse(storedToken.user),
    });
  } catch (error) {
    storedToken.revokedAt = new Date();
    await storedToken.save();
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  await RefreshToken.findOneAndUpdate(
    { token: hashToken(refreshToken), revokedAt: null },
    { revokedAt: new Date() }
  );

  return res.status(200).json({ message: "Logged out successfully" });
};

const logoutAllSessions = async (req, res) => {
  await RefreshToken.updateMany(
    { user: req.user._id, revokedAt: null },
    { revokedAt: new Date() }
  );

  return res.status(200).json({ message: "Logged out from all sessions" });
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  logoutAllSessions,
};

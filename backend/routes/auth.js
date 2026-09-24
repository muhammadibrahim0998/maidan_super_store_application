import express from "express";
import User from "../models/User.js";
import { validateLogin } from "../validators/authValidator.js";

const router = express.Router();

/**
 * Detect if the request arrived over HTTPS.
 * Works locally (req.secure = false on plain HTTP)
 * and on Railway/Vercel where x-forwarded-proto = 'https'.
 * app.set('trust proxy', 1) is required for req.secure to work behind Railway's proxy.
 */
const isHttps = (req) =>
  req.secure || req.headers['x-forwarded-proto'] === 'https';

/**
 * Build cookie options based on whether the connection is HTTPS.
 * - HTTPS (Railway production): secure + sameSite:none  → cross-domain cookies work
 * - HTTP (localhost dev):       not secure + sameSite:lax → local cookies work
 */
const getCookieOptions = (req, extra = {}) => ({
  httpOnly: true,
  secure: isHttps(req),
  sameSite: isHttps(req) ? 'none' : 'lax',
  path: '/',
  ...extra,
});

import { authenticate } from '../middleware/auth.js';

/**
 * @desc    Get Current User (Verify session)
 * @route   GET /api/auth/me
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        shopId: user.shopId
      }
    });
  } catch (error) {
    console.error("Auth /me Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Login User & Set Cookie
 * @route   POST /api/auth/login
 */
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // allow login with either username or email
    const user = await User.findOne({ $or: [{ username }, { email: username }] });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password"
      });
    }



    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: "Account is inactive. Please contact admin." 
      });
    }

    user.lastLogged = new Date();
    await user.save();

    // 30-day session cookie — flags adapt to HTTP vs HTTPS automatically
    res.cookie('nexflow_sess', user._id.toString(), getCookieOptions(req, {
      maxAge: 30 * 24 * 60 * 60 * 1000
    }));

    console.log(`[Login] User: ${username} | HTTPS: ${isHttps(req)} | sameSite: ${isHttps(req) ? 'none' : 'lax'}`);

    res.json({
      success: true,
      message: "Login successful",
      token: user._id.toString(),
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        shopId: user.shopId
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Logout User
 * @route   POST /api/auth/logout
 */
router.post("/logout", (req, res) => {
  res.clearCookie('nexflow_sess', getCookieOptions(req));
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
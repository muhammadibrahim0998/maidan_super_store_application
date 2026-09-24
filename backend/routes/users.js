import express from "express";
import User from "../models/User.js";
import { logSystemUpdate } from "../utils/updateHelper.js";

const router = express.Router();

import { authenticate, requireShopAdmin } from "../middleware/auth.js";
import { memberSchema, validate } from "../validators/memberValidator.js";

// Get all users
router.get("/", authenticate, requireShopAdmin, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'super_admin') {
      if (req.query.shopId) query.shopId = req.query.shopId;
    } else {
      if (!req.user.shopId) return res.status(400).json({ message: "shopId is required" });
      query.shopId = req.user.shopId;
    }
    const users = await User.find(query, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new user
router.post("/", authenticate, requireShopAdmin, validate(memberSchema), async (req, res) => {
  try {
    const { username, password, fullName, role, status, preferredShift } = req.body;
    
    // Prevent shop_admin from creating super_admin
    if (req.user.role === 'shop_admin' && (role === 'super_admin' || role === 'shop_admin')) {
      return res.status(403).json({ message: "Shop admins cannot create other admins" });
    }

    const shopId = req.user.role === 'super_admin' ? req.body.shopId : req.user.shopId;
    if (!shopId && role !== 'super_admin') 
      return res.status(400).json({ message: "shopId is required" });

    const user = new User({ username, password, fullName, role, status, shopId, preferredShift });
    await user.save();

    // Log system update for new team member
    await logSystemUpdate(
      "Security & Logic", 
      "shield", 
      `New Terminal access granted: ${user.fullName} (@${user.username})`
    );

    res.status(201).json({ 
      message: "User created successfully", 
      user: { id: user._id, username: user.username, role: user.role } 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update user details
router.put("/:id", authenticate, requireShopAdmin, validate(memberSchema), async (req, res) => {
  try {
    const { username, password, fullName, role, status, preferredShift } = req.body;
    
    // Security: Only super_admin or shop_admin of the same shop
    const query = req.user.role === 'super_admin' ? 
    { _id: req.params.id } : { _id: req.params.id, shopId: req.user.shopId };
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: "User not found or unauthorized" });

    if (username) user.username = username;
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (status) user.status = status;
    if (preferredShift) user.preferredShift = preferredShift;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();
    res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user
router.delete("/:id", authenticate, requireShopAdmin, async (req, res) => {
  try {
    const query = req.user.role === 'super_admin' ? 
    { _id: req.params.id } : { _id: req.params.id, shopId: req.user.shopId };
    const user = await User.findOneAndDelete(query);
    if (!user) return res.status(404).json({ message: "User not found or unauthorized" });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

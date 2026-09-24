import express from 'express';
import CashSession from '../models/CashSession.js';
import { authenticate, preventSuperAdmin } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get current open session
router.get('/current', authenticate, preventSuperAdmin, async (req, res) => {
  try {
    const session = await CashSession.findOne({ 
      status: 'open',
      shopId: req.user.shopId 
    });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start a new session
router.post('/start', authenticate, preventSuperAdmin, async (req, res) => {
  const { openingCash, cashierId, shiftType } = req.body;
  
  try {
    // Check if there's already an open session for THIS SHOP
    const existing = await CashSession.findOne({ 
      status: 'open',
      shopId: req.user.shopId
    });
    if (existing) {
      return res.status(400).json({ message: 'A session is already open for this shop' });
    }

    // Determine the shopId
    // If cashierId is provided and different from the authenticated user, we might need to fetch the cashier's shopId
    let shopId = req.user.shopId;
    
    if (cashierId && cashierId !== req.user._id.toString()) {
      const targetUser = await User.findById(cashierId);
      if (targetUser) shopId = targetUser.shopId;
    }

    if (!shopId) {
       return res.status(400).json({ message: 'Shop context missing for this session' });
    }

    const session = new CashSession({
      openingCash,
      cashierId: cashierId || req.user._id,
      shopId,
      shiftType,
      status: 'open',
      expectedCash: openingCash
    });

    const newSession = await session.save();
    res.status(201).json(newSession);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// End current session
router.post('/end', authenticate, preventSuperAdmin, async (req, res) => {
  const { actualCash, notes, userId } = req.body;
  
  try {
    const session = await CashSession.findOne({ 
      status: 'open',
      shopId: req.user.shopId
    });
    if (!session) {
      return res.status(404).json({ message: 'No open session found for this shop' });
    }

    session.actualCash = actualCash;
    session.closingCash = actualCash;
    session.endTime = Date.now();
    session.status = 'closed';
    session.notes = notes;
    session.closedBy = userId;

    const updatedSession = await session.save();
    res.json(updatedSession);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get session history
router.get('/history', authenticate, preventSuperAdmin, async (req, res) => {
  try {
    const query = { shopId: req.user.shopId };
    const sessions = await CashSession.find(query)
      .populate('cashierId', 'fullName role')
      .populate('closedBy', 'fullName role')
      .sort({ startTime: -1 })
      .limit(30);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

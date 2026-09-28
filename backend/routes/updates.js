import express from 'express';

const router = express.Router();

// @route   GET api/updates
// @desc    Get all active system updates
// @access  Public
router.get('/', async (req, res) => {
  try {
    const updates = [
      {
        category: "New Features",
        iconType: "zap",
        items: [
          "Real-time stock alerts and inventory health ledger.",
          "Interactive analytics cards with live revenue tracking.",
          "Supplier & Customer Khata credit management system."
        ]
      },
      {
        category: "UI Improvements",
        iconType: "sparkles",
        items: [
          "Clean White & Gray SaaS theme layout.",
          "Smooth Framer Motion animations across all dashboards.",
          "Optimized mobile layout for on-the-go management."
        ]
      },
      {
        category: "Database & Security",
        iconType: "shield",
        items: [
          "High-performance MySQL database architecture.",
          "Auto-increment digit IDs and indexed queries.",
          "Robust validation and real-time inventory tracking."
        ]
      }
    ];

    res.json(updates);
  } catch (err) {
    console.error('Error fetching updates:', err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST api/updates
// @desc    Create a new system update
router.post('/', async (req, res) => {
  try {
    const { category, iconType, items } = req.body;
    res.status(201).json({ success: true, message: 'Update logged', update: { category, iconType, items } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;

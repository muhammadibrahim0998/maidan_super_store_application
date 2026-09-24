import express from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { validateShop } from '../validators/shopValidator.js';
import Shop from '../models/Shop.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Item from '../models/Item.js';

const router = express.Router();

// Get all shops (Super Admin only)
router.get('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create shop (Super Admin only)
router.post('/', authenticate, requireSuperAdmin, validateShop, async (req, res) => {
  try {
    const { name, address, contactNumber, adminUsername, adminPassword, adminFullName, adminEmail, adminPhone, logoUrl, easypaisaNumber } = req.body;
    
    // Check if username is taken
    if (adminUsername) {
      const existingUser = await User.findOne({ username: adminUsername });
      if (existingUser) {
        return res.status(400).json({ message: "Admin username is already taken" });
      }
    }

    const shop = new Shop({ 
      name, 
      address, 
      contactNumber, 
      logoUrl,
      ownerDetails: {
        fullName: adminFullName || 'Shop Admin',
        email: adminEmail || adminUsername || '',
        phone: adminPhone || ''
      }
    });
    await shop.save();

    // Create initial settings for the shop
    const settings = new Settings({
      shopId: shop._id,
      shopName: name,
      address: address || '',
      phone: contactNumber || '',
      easypaisaNumber: easypaisaNumber || '',
      easypaisaEnabled: easypaisaNumber ? true : false,
    });
    await settings.save();

    let adminUser = null;
    if (adminUsername && adminPassword) {
      adminUser = new User({
        username: adminUsername,
        password: adminPassword,
        email: adminEmail || adminUsername || undefined,
        fullName: adminFullName || 'Shop Admin',
        role: 'shop_admin',
        shopId: shop._id
      });
      await adminUser.save();
    }

    res.status(201).json({ shop, adminUser, settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update shop details
router.put('/:id', authenticate, validateShop, async (req, res) => {
  try {
    const { name, address, contactNumber, status, ownerEmail } = req.body;
    
    // Authorization Check: Super Admin OR the Shop's Admin
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOwnShop = req.user.shopId && req.user.shopId.toString() === req.params.id;

    if (!isSuperAdmin && !isOwnShop) {
      return res.status(403).json({ message: "Not authorized to update this shop" });
    }

    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    // Only Super Admin can change shop status
    shop.name = name;
    shop.address = address;
    shop.contactNumber = contactNumber;
    
    if (isSuperAdmin && status) {
      shop.status = status;
    }
    
    if (ownerEmail !== undefined) {
      if (!shop.ownerDetails) shop.ownerDetails = {};
      shop.ownerDetails.email = ownerEmail;
      
      // Update the user's email too if we have a match
      if (shop.ownerDetails.fullName) {
         // Assuming the first shop_admin is the owner
         await User.findOneAndUpdate(
           { shopId: shop._id, role: 'shop_admin' },
           { email: ownerEmail }
         );
      }
    }

    await shop.save();
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json(shop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete shop (Super Admin only)
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    // Also remove associated users
    await User.deleteMany({ shopId: req.params.id });
    res.json({ message: 'Shop and associated users deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

import express from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { validateShop } from '../validators/shopValidator.js';
import { pool } from '../config/mysql.js';
import Shop from '../models/Shop.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Item from '../models/Item.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import DamagedProduct from '../models/DamagedProduct.js';
import CashSession from '../models/CashSession.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

const router = express.Router();

// Get all shops (Super Admin only)
router.get('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });
    
    // Enrich with admin and settings data
    const enrichedShops = await Promise.all(shops.map(async (shop) => {
      const shopObj = typeof shop.toObject === 'function' ? shop.toObject() : { ...shop };
      try {
        const [adminUser, settings] = await Promise.all([
          User.findOne({ shopId: shop.id, role: 'shop_admin' }),
          Settings.findOne({ shopId: shop.id })
        ]);
        
        shopObj.ownerDetails = {
          fullName: shop.ownerFullName || adminUser?.fullName || 'Shop Admin',
          email: shop.ownerEmail || adminUser?.username || adminUser?.email || '',
          phone: shop.ownerPhone || adminUser?.phoneNumber || shop.contactNumber || ''
        };
        shopObj.easypaisaNumber = settings?.easypaisaNumber || '';
        shopObj.easypaisaEnabled = settings?.easypaisaEnabled ? 1 : 0;
        shopObj.adminUsername = adminUser?.username || '';
        shopObj.adminFullName = adminUser?.fullName || shop.ownerFullName || '';
      } catch (e) {
        // retain defaults
      }
      return shopObj;
    }));

    res.json(enrichedShops);
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
      ownerFullName: adminFullName || 'Shop Admin',
      ownerEmail: adminEmail || adminUsername || '',
      ownerPhone: adminPhone || contactNumber || ''
    });
    await shop.save();

    // Create initial settings for the shop
    const settings = new Settings({
      shopId: shop.id,
      shopName: name,
      address: address || '',
      phone: contactNumber || '',
      ownerFullName: adminFullName || 'Shop Admin',
      ownerEmail: adminEmail || adminUsername || '',
      ownerPhone: adminPhone || contactNumber || '',
      easypaisaNumber: easypaisaNumber || '',
      easypaisaEnabled: easypaisaNumber ? 1 : 0,
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
        shopId: shop.id
      });
      await adminUser.save();
    }

    res.status(201).json({ shop, adminUser, settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update shop details
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { 
      name, 
      address, 
      contactNumber, 
      status, 
      ownerEmail, 
      ownerFullName, 
      ownerPhone, 
      adminUsername, 
      adminPassword, 
      adminFullName, 
      easypaisaNumber, 
      easypaisaEnabled, 
      logoUrl 
    } = req.body;
    
    // Authorization Check: Super Admin OR the Shop's Admin
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOwnShop = req.user.shopId && String(req.user.shopId) === String(req.params.id);

    if (!isSuperAdmin && !isOwnShop) {
      return res.status(403).json({ message: "Not authorized to update this shop" });
    }

    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    if (name) shop.name = name;
    if (address !== undefined) shop.address = address;
    if (contactNumber !== undefined) shop.contactNumber = contactNumber;
    if (logoUrl !== undefined) shop.logoUrl = logoUrl;
    
    if (isSuperAdmin && status) {
      shop.status = status;
    }

    const finalFullName = adminFullName || ownerFullName;
    const finalEmail = adminUsername || ownerEmail;
    const finalPhone = ownerPhone || contactNumber;

    if (finalFullName !== undefined) shop.ownerFullName = finalFullName;
    if (finalEmail !== undefined) shop.ownerEmail = finalEmail;
    if (finalPhone !== undefined) shop.ownerPhone = finalPhone;

    await shop.save();

    // Update settings
    try {
      let settings = await Settings.findOne({ shopId: shop.id });
      if (!settings) {
        settings = new Settings({ shopId: shop.id });
      }
      if (name) settings.shopName = name;
      if (address !== undefined) settings.address = address;
      if (contactNumber !== undefined) settings.phone = contactNumber;
      if (easypaisaNumber !== undefined) settings.easypaisaNumber = easypaisaNumber;
      if (easypaisaEnabled !== undefined) settings.easypaisaEnabled = easypaisaEnabled ? 1 : 0;
      if (finalFullName !== undefined) settings.ownerFullName = finalFullName;
      if (finalEmail !== undefined) settings.ownerEmail = finalEmail;
      await settings.save();
    } catch (e) {
      console.error('Error updating shop settings:', e);
    }

    // Update shop admin user if needed
    try {
      const adminUser = await User.findOne({ shopId: shop.id, role: 'shop_admin' });
      if (adminUser) {
        if (finalFullName) adminUser.fullName = finalFullName;
        if (finalEmail) {
          adminUser.email = finalEmail;
          adminUser.username = finalEmail;
        }
        if (adminPassword && adminPassword.trim().length >= 6) {
          adminUser.password = adminPassword.trim();
        }
        await adminUser.save();
      }
    } catch (e) {
      console.error('Error updating shop admin user:', e);
    }

    res.json({ success: true, message: 'Shop updated successfully', shop });
  } catch (error) {
    console.error('Error in shop update:', error);
    res.status(400).json({ message: error.message || 'Failed to update shop' });
  }
});

// Delete shop (Super Admin only)
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const shopId = req.params.id;
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const numShopId = shop.id;

    // Direct and complete cascading removal of all records associated with this shop
    await pool.query(`DELETE FROM \`shops\` WHERE id = ?`, [numShopId]);
    await pool.query(`DELETE FROM \`users\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`settings\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`items\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`sales\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`expenses\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`damaged_products\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`cash_sessions\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`customers\` WHERE shopId = ?`, [numShopId]).catch(() => {});
    await pool.query(`DELETE FROM \`orders\` WHERE shopId = ?`, [numShopId]).catch(() => {});

    res.json({ success: true, message: 'Shop and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ message: error.message || 'Failed to delete shop' });
  }
});

export default router;

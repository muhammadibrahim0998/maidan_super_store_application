import express from 'express';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import User from '../models/User.js';
import Sale from '../models/Sale.js';
import Order from '../models/Order.js';

const router = express.Router();

// ─── Middleware: Verify customer session via token ───────────────────────────
const authenticateCustomer = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const customerId = authHeader.split(' ')[1];
  try {
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(401).json({ message: 'Invalid session' });
    req.customer = customer;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid session' });
  }
};

import mongoose from 'mongoose';
import { resolveShopId } from '../utils/shopResolver.js';

// ─── GET ALL CUSTOMERS (FOR ADMIN DASHBOARD) ──────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const { shopId } = req.query;
    let filter = {};
    if (shopId) {
      const resolved = await resolveShopId(shopId);
      if (resolved) {
        filter = { shopId: resolved };
      }
    }
    const customers = await Customer.find(filter).select('-password');
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, shopId } = req.body;
    if (!fullName || !email || !password || !shopId) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existing = await Customer.findOne({ email, shopId });
    if (existing) return res.status(409).json({ message: 'Email already registered for this shop' });

    const customer = new Customer({ fullName, email, password, shopId });
    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      customerId: customer._id,
      fullName: customer.fullName,
      email: customer.email
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, shopId } = req.body;
    if (!email || !password || !shopId) {
      return res.status(400).json({ message: 'Email, password, and shopId are required' });
    }
    
    // 1. Try Customer Login
    const customer = await Customer.findOne({ email, shopId });
    if (customer && (await customer.comparePassword(password))) {
      return res.json({
        success: true,
        customerId: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        cart: customer.cart,
        role: 'customer'
      });
    }

    // 2. Try User (Shop Admin) Login as fallback
    // Some shop admins use the Customer Storefront and expect to login there.
    const user = await User.findOne({ $or: [{ email: email }, { username: email }] });
    if (user && (await user.comparePassword(password))) {
      // Create a JWT token for the user so they can act as an admin!
      const jwt = (await import('jsonwebtoken')).default;
      const token = jwt.sign(
        { id: user._id, role: user.role, shopId: user.shopId },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1d' }
      );

      return res.json({
        success: true,
        customerId: user._id, // map _id to customerId so frontend context doesn't break
        fullName: user.fullName,
        email: user.email || user.username,
        cart: [],
        role: user.role,
        token: token
      });
    }

    // If neither matches
    return res.status(401).json({ message: 'Invalid email/username or password' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET CART ─────────────────────────────────────────────────────────────────
router.get('/cart', authenticateCustomer, (req, res) => {
  res.json({ cart: req.customer.cart });
});

// ─── ADD TO CART ──────────────────────────────────────────────────────────────
router.post('/cart', authenticateCustomer, async (req, res) => {
  try {
    const { itemId, quantity = 1, unit = 'egg' } = req.body;
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Product not found' });
    if (item.stock < quantity && unit === 'egg') return res.status(400).json({ message: 'Not enough stock' });

    const basePrice = Number(item.price) || 0;
    const pEgg = Number(item.pricePerEgg) || 0;
    const pTray = Number(item.pricePerTray) || 0;
    const pPeti = Number(item.pricePerPeti) || 0;
    const uType = String(item.unitType || 'tray').toLowerCase();

    let eggRate = pEgg;
    if (!eggRate && pTray > 0) eggRate = pTray / 30;
    else if (!eggRate && pPeti > 0) eggRate = pPeti / 360;
    else if (!eggRate && basePrice > 0) {
      eggRate = uType === 'peti' ? basePrice / 360 : uType === 'tray' ? basePrice / 30 : basePrice;
    }
    if (!eggRate) eggRate = 30;

    let finalPrice = Math.round(eggRate);
    if (unit === 'peti') {
      finalPrice = pPeti > 0 ? pPeti : pTray > 0 ? pTray * 12 : Math.round(eggRate * 360);
    } else if (unit === 'tray') {
      finalPrice = pTray > 0 ? pTray : pPeti > 0 ? Math.round(pPeti / 12) : Math.round(eggRate * 30);
    }

    const unitLabel = unit === 'peti' ? 'Box' : unit === 'tray' ? 'Pack' : 'Product';
    const cleanName = item.name.replace(/\s*\((Peti|Tray|Egg|Box|Pack|Product)\)/gi, '').trim();

    const customer = req.customer;
    const existing = customer.cart.find(c => c.itemId.toString() === itemId && (c.unit || 'egg') === unit);
    if (existing) {
      existing.quantity += quantity;
      existing.price = finalPrice;
    } else {
      customer.cart.push({
        itemId: item._id,
        name: `${cleanName} (${unitLabel})`,
        unit: unit,
        price: finalPrice,
        image: item.images?.[0] || '',
        quantity
      });
    }
    await customer.save();
    res.json({ success: true, cart: customer.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE CART ITEM QTY / UNIT ──────────────────────────────────────────────
router.put('/cart/:itemId', authenticateCustomer, async (req, res) => {
  try {
    const { quantity, unit, newUnit } = req.body;
    const customer = req.customer;
    const currentUnit = unit || 'egg';
    const cartItem = customer.cart.find(c => c.itemId.toString() === req.params.itemId && (c.unit || 'egg') === currentUnit);
    if (!cartItem) return res.status(404).json({ message: 'Item not in cart' });

    if (quantity !== undefined) {
      if (quantity <= 0) {
        customer.cart = customer.cart.filter(c => !(c.itemId.toString() === req.params.itemId && (c.unit || 'egg') === currentUnit));
      } else {
        cartItem.quantity = quantity;
      }
    }

    if (newUnit && newUnit !== currentUnit) {
      const item = await Item.findById(req.params.itemId);
      if (item) {
        const basePrice = Number(item.price) || 0;
        const pEgg = Number(item.pricePerEgg) || 0;
        const pTray = Number(item.pricePerTray) || 0;
        const pPeti = Number(item.pricePerPeti) || 0;
        const uType = String(item.unitType || 'tray').toLowerCase();

        let eggRate = pEgg;
        if (!eggRate && pTray > 0) eggRate = pTray / 30;
        else if (!eggRate && pPeti > 0) eggRate = pPeti / 360;
        else if (!eggRate && basePrice > 0) {
          eggRate = uType === 'peti' ? basePrice / 360 : uType === 'tray' ? basePrice / 30 : basePrice;
        }
        if (!eggRate) eggRate = 30;

        let unitPrice = Math.round(eggRate);
        if (newUnit === 'peti') {
          unitPrice = pPeti > 0 ? pPeti : pTray > 0 ? pTray * 12 : Math.round(eggRate * 360);
        } else if (newUnit === 'tray') {
          unitPrice = pTray > 0 ? pTray : pPeti > 0 ? Math.round(pPeti / 12) : Math.round(eggRate * 30);
        }

        const unitLabel = newUnit === 'peti' ? 'Peti' : newUnit === 'tray' ? 'Tray' : 'Egg';
        const cleanName = item.name.replace(/\s*\((Peti|Tray|Egg)\)/gi, '').trim();

        // Check if item with newUnit already exists in cart, merge if so
        const existingNewUnitItem = customer.cart.find(c => c.itemId.toString() === req.params.itemId && (c.unit || 'egg') === newUnit);
        if (existingNewUnitItem) {
          existingNewUnitItem.quantity += cartItem.quantity;
          customer.cart = customer.cart.filter(c => !(c.itemId.toString() === req.params.itemId && (c.unit || 'egg') === currentUnit));
        } else {
          cartItem.unit = newUnit;
          cartItem.price = unitPrice;
          cartItem.name = `${cleanName} (${unitLabel})`;
        }
      }
    }

    await customer.save();
    res.json({ success: true, cart: customer.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── REMOVE FROM CART ────────────────────────────────────────────────────────
router.delete('/cart/:itemId', authenticateCustomer, async (req, res) => {
  try {
    const customer = req.customer;
    const { unit } = req.query;
    if (unit) {
      customer.cart = customer.cart.filter(c => !(c.itemId.toString() === req.params.itemId && (c.unit || 'egg') === unit));
    } else {
      customer.cart = customer.cart.filter(c => c.itemId.toString() !== req.params.itemId);
    }
    await customer.save();
    res.json({ success: true, cart: customer.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CLEAR CART ───────────────────────────────────────────────────────────────
router.delete('/cart', authenticateCustomer, async (req, res) => {
  try {
    req.customer.cart = [];
    await req.customer.save();
    res.json({ success: true, cart: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE CUSTOMER (ADMIN OR CUSTOMER) ──────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }
    const { fullName, email, phone, address, password } = req.body;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const oldName = customer.fullName;
    const oldEmail = customer.email;
    const oldPhone = customer.phone;

    if (fullName) customer.fullName = fullName.trim();
    if (email) customer.email = email.trim().toLowerCase();
    if (phone !== undefined) customer.phone = phone.trim();
    if (address !== undefined) customer.address = address.trim();
    if (password && password.trim().length > 0) customer.password = password.trim();

    await customer.save();

    // ─── CASCADE UPDATE IN ALL SALES & ORDERS ───────────────────────────
    const newName = customer.fullName;
    const newEmail = customer.email;
    const newPhone = customer.phone;

    // 1. Update all Sales linked by customerId, oldEmail, or oldName
    const saleQuery = {
      $or: [
        { customerId: customer._id },
        { customerEmail: oldEmail },
        { $and: [{ customerName: oldName }, { shopId: customer.shopId }] }
      ]
    };

    const saleUpdates = {
      customerName: newName,
      customerEmail: newEmail,
    };
    if (newPhone) {
      saleUpdates.customerPhone = newPhone;
    }

    await Sale.updateMany(saleQuery, { $set: saleUpdates });

    // 2. Update all Orders linked by customerId
    const orderQuery = { customerId: customer._id };
    const orderUpdates = {
      'shippingDetails.fullName': newName
    };
    if (newPhone) orderUpdates['shippingDetails.phone'] = newPhone;
    if (customer.address) orderUpdates['shippingDetails.address'] = customer.address;

    await Order.updateMany(orderQuery, { $set: orderUpdates });

    res.json({
      success: true,
      message: 'Customer account updated and synchronized across all sales records successfully',
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        shopId: customer.shopId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }
    });
  } catch (err) {
    console.error('Update customer error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already in use by another customer' });
    }
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE CUSTOMER (ADMIN ONLY) ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer account deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

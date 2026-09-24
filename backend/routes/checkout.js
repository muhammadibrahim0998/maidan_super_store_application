import express from 'express';
import Stripe from 'stripe';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import Item from '../models/Item.js';
import Settings from '../models/Settings.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { authenticate, requireShopAdmin } from '../middleware/auth.js';

const router = express.Router();
// Initialize stripe with dummy key if not present in env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// Middleware to verify customer
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

// Checkout endpoint
router.post('/', authenticateCustomer, async (req, res) => {
  try {
    const { paymentMethod, shippingDetails } = req.body;
    const customer = req.customer;

    if (!customer.cart || customer.cart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total amount
    const totalAmount = customer.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shopId = customer.shopId;

    // Create Order
    const order = new Order({
      shopId,
      customerId: customer._id,
      items: customer.cart,
      totalAmount,
      shippingDetails,
      paymentMethod,
      paymentStatus: 'PENDING'
    });

    await order.save();

    // Automatically record this online customer transaction into Sale collection
    try {
      const saleItems = (customer.cart || []).map(item => ({
        productId: item.productId || item._id,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
        profit: (Number(item.price) - Number(item.costPrice || 0)) * (Number(item.quantity) || 1)
      }));

      const newSale = new Sale({
        shopId,
        orderId: order._id,
        items: saleItems,
        totalAmount,
        totalProfit: saleItems.reduce((s, i) => s + (i.profit || 0), 0),
        saleDate: new Date(),
        status: 'completed',
        cashierName: 'Online Storefront',
        customerName: customer.fullName || shippingDetails?.fullName || 'Online Customer',
        customerPhone: customer.phone || shippingDetails?.phone || '',
        customerEmail: customer.email || shippingDetails?.email || '',
        customerId: customer._id,
        paymentMethod: paymentMethod === 'COD' ? 'CASH' : (paymentMethod === 'STRIPE' ? 'ONLINE' : 'BANK_TRANSFER'),
        cashPaid: paymentMethod === 'COD' ? totalAmount : 0,
        bankPaid: (paymentMethod === 'STRIPE' || paymentMethod === 'EASYPAISA' || paymentMethod === 'BANK') ? totalAmount : 0,
        dueAmount: 0,
        isOnlineOrder: true,
        orderSource: 'ONLINE_STOREFRONT'
      });
      await newSale.save();
    } catch (saleErr) {
      console.error('Failed to create sale for order:', saleErr);
    }

    if (paymentMethod === 'COD') {
      // For Cash on Delivery, just confirm the order and clear the cart
      customer.cart = [];
      await customer.save();
      return res.json({ success: true, message: 'Order placed successfully (COD)', orderId: order._id });
    }
    else if (paymentMethod === 'STRIPE') {
      // Create Stripe Checkout Session
      const line_items = customer.cart.map(item => ({
        price_data: {
          currency: 'usd', // Defaulting to USD for Stripe
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(item.price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      }));

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        success_url: `${frontendUrl}/store?payment=success&orderId=${order._id}`,
        cancel_url: `${frontendUrl}/store?payment=cancel`,
        metadata: {
          orderId: order._id.toString()
        }
      });

      return res.json({ success: true, sessionId: session.id, url: session.url });
    }
    else if (paymentMethod === 'EASYPAISA') {
      // Fetch this shop's EasyPaisa number from Settings
      let easypaisaNumber = process.env.SUPERADMIN_EASYPAISA_NUMBER || '03098216202';
      let accountTitle = 'Super Admin';
      let easypaisaEnabled = true;

      if (shopId) {
        const shopSettings = await Settings.findOne({ shopId });
        if (shopSettings && shopSettings.easypaisaNumber) {
          easypaisaNumber = shopSettings.easypaisaNumber;
          easypaisaEnabled = shopSettings.easypaisaEnabled !== false;
          accountTitle = shopSettings.ownerFullName || shopSettings.shopName || 'Shop Admin';
        }
      }

      if (!easypaisaEnabled) {
        return res.status(400).json({ message: 'EasyPaisa payment is not enabled for this shop' });
      }

      const easyPaisaData = {
        superAdminNumber: easypaisaNumber,
        accountTitle,
        orderId: order._id.toString(),
        transactionAmount: totalAmount,
      };

      return res.json({ success: true, easyPaisaData, message: 'EasyPaisa Account Details' });
    }
    else {
      return res.status(400).json({ message: 'Invalid Payment Method' });
    }

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Endpoint to submit payment proof (EasyPaisa) - stays PENDING until Admin verifies
router.post('/confirm/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Do NOT auto-mark as PAID. Store the proof/reference and keep it PENDING
    // so the Shop Admin can manually verify and confirm the payment.
    if (req.body.transactionId) {
      order.transactionId = req.body.transactionId;
    }
    if (req.body.paymentProof) {
      order.paymentProof = req.body.paymentProof;
    }
    // paymentStatus stays 'PENDING' (default) until admin confirms
    await order.save();

    // Clear customer cart since the order has been placed
    const customer = await Customer.findById(order.customerId);
    if (customer) {
      customer.cart = [];
      await customer.save();
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Endpoint for a logged-in customer to view their own orders
router.get('/my-orders', authenticateCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.customer._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

import { resolveShopId } from '../utils/shopResolver.js';

// Endpoint to fetch all orders for SuperAdmin / ShopAdmin inspection
router.get('/orders', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const { shopId, paymentMethod, paymentStatus, orderStatus } = req.query;
    const query = {};

    // Shop Admins can only ever see their own shop's orders
    const targetRaw = (req.user?.role === 'shop_admin') ? req.user.shopId : shopId;
    if (targetRaw) {
      const resolved = await resolveShopId(targetRaw);
      if (resolved && mongoose.Types.ObjectId.isValid(resolved)) {
        query.shopId = resolved;
      }
    }

    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (orderStatus) query.orderStatus = orderStatus;

    const orders = await Order.find(query)
      .populate('shopId', 'name address')
      .populate('customerId', 'fullName email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Endpoint to fetch a single order (full order view)
router.get('/order/:orderId', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('shopId', 'name address')
      .populate('customerId', 'fullName email phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user?.role === 'shop_admin' && String(order.shopId?._id) !== String(req.user?.shopId)) {
      return res.status(403).json({ message: 'Access denied for this order' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Endpoint to update payment status or order status
router.patch('/order/:orderId/status', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const { paymentStatus, orderStatus } = req.body;
    const order = await Order.findById(req.params.orderId).populate('customerId', 'fullName email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user?.role === 'shop_admin' && String(order.shopId) !== String(req.user?.shopId)) {
      return res.status(403).json({ message: 'Access denied for this order' });
    }

    const previousStatus = order.paymentStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (orderStatus) order.orderStatus = orderStatus;

    // When payment is approved (PAID) and was not PAID before:
    if (paymentStatus === 'PAID' && previousStatus !== 'PAID') {
      let totalProfit = 0;
      const saleItems = [];

      for (const item of (order.items || [])) {
        const prodId = item.itemId || item.productId;
        let dbItem = null;
        if (prodId) {
          try {
            dbItem = await Item.findById(prodId);
          } catch (e) { }
        }

        if (dbItem) {
          // Deduct stock safely
          const qty = Number(item.quantity) || 1;
          dbItem.stock = Math.max(0, dbItem.stock - qty);
          if (dbItem.unitType === 'peti') {
            dbItem.petiQuantity = Math.max(0, (dbItem.petiQuantity || 0) - qty);
          } else if (dbItem.unitType === 'tray') {
            dbItem.trayQuantity = Math.max(0, (dbItem.trayQuantity || 0) - qty);
          } else if (dbItem.unitType === 'egg') {
            dbItem.eggQuantity = Math.max(0, (dbItem.eggQuantity || 0) - qty);
          } else if ((dbItem.petiQuantity || 0) > 0) {
            dbItem.petiQuantity = Math.max(0, dbItem.petiQuantity - qty);
          }
          dbItem.lastUpdated = new Date().toISOString().split('T')[0];
          await dbItem.save();

          const costPrice = dbItem.costPrice || 0;
          const profit = (item.price - costPrice) * (item.quantity || 1);
          totalProfit += profit;

          saleItems.push({
            productId: dbItem._id,
            name: item.name || dbItem.name,
            quantity: item.quantity || 1,
            price: item.price,
            costPrice,
            subtotal: item.price * (item.quantity || 1),
            profit
          });
        } else {
          saleItems.push({
            productId: prodId || new mongoose.Types.ObjectId(),
            name: item.name || 'Product',
            quantity: item.quantity || 1,
            price: item.price || 0,
            subtotal: (item.price || 0) * (item.quantity || 1),
            profit: 0
          });
        }
      }

      const existingSale = await Sale.findOne({ orderId: order._id });
      if (existingSale) {
        existingSale.approvalStatus = 'APPROVED';
        existingSale.status = 'completed';
        if (totalProfit) existingSale.totalProfit = totalProfit;
        await existingSale.save();
      } else {
        const sale = new Sale({
          shopId: order.shopId,
          orderId: order._id,
          customerId: order.customerId?._id || order.customerId,
          items: saleItems,
          totalAmount: order.totalAmount,
          totalProfit,
          saleDate: order.createdAt || new Date(),
          status: 'completed',
          cashierName: req.user?.fullName || 'Online Storefront',
          customerName: order.customerId?.fullName || order.shippingDetails?.fullName || 'Online Customer',
          customerEmail: order.customerId?.email || order.shippingDetails?.email || '',
          customerPhone: order.customerId?.phone || order.shippingDetails?.phone || '',
          paymentMethod: order.paymentMethod === 'COD' ? 'CASH' : (order.paymentMethod === 'STRIPE' ? 'ONLINE' : 'BANK_TRANSFER'),
          cashPaid: order.paymentMethod === 'COD' ? order.totalAmount : 0,
          bankPaid: order.paymentMethod !== 'COD' ? order.totalAmount : 0,
          dueAmount: 0,
          isOnlineOrder: true,
          orderSource: 'ONLINE_STOREFRONT',
          approvalStatus: 'APPROVED'
        });
        await sale.save();
      }
    }

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Endpoint to delete payment proof screenshot of an order
router.delete('/order/:orderId/proof', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user?.role === 'shop_admin' && String(order.shopId) !== String(req.user?.shopId)) {
      return res.status(403).json({ message: 'Access denied for this order' });
    }

    order.paymentProof = undefined;
    await order.save();
    res.json({ success: true, message: 'Payment screenshot proof deleted successfully', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Endpoint to delete an order completely
router.delete('/order/:orderId', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user?.role === 'shop_admin' && String(order.shopId) !== String(req.user?.shopId)) {
      return res.status(403).json({ message: 'Access denied for this order' });
    }

    await order.deleteOne();
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;


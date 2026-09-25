import express from 'express';
const router = express.Router();
import Sale from '../models/Sale.js';
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import CashSession from '../models/CashSession.js';
import { generateInvoice } from '../utils/generateInvoice.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Settings from '../models/Settings.js';
import { authenticate, requireShopAdmin, preventSuperAdmin } from '../middleware/auth.js';
import { resolveShopId } from '../utils/shopResolver.js';

// Helper to verify Owner Password (Anti-Theft)
// We now use `authenticate` and `requireShopAdmin` standard RBAC for powerful actions
// If you want to keep the literal pin-based password logic, you can combine them, but for Multi-Tenant RBAC
// checking user roles (requireShopAdmin) is standard. We'll leave the password check wrapped over the new system to preserve feature parity.
const verifyOwnerPassword = async (req, res, next) => {
  try {
    const password = req.headers['x-owner-password'];
    
    // Bypass if user is super admin or shop admin from token
    if (req.user && ['super_admin', 'shop_admin'].includes(req.user.role)) return next();

    let settings = await Settings.findOne({ shopId: req.user.shopId });
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    const correctPassword = settings.ownerPassword;
    
    if (password !== correctPassword) {
      return res.status(403).json({ message: "Owner authorization required for this action." });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Auth check failed" });
  }
};

// ── Super Admin: Get ALL sales across all shops ──────────────────────
router.get('/all', authenticate, async (req, res) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super Admin only.' });
  }
  try {
    const sales = await Sale.find({}).sort({ saleDate: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

import mongoose from 'mongoose';

// Get all sales (shop admin - their shop only)
router.get('/', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const rawShopId = req.query.shopId || (req.user && req.user.shopId);
    let filter = {};
    if (rawShopId) {
      const targetShopId = await resolveShopId(rawShopId);
      if (targetShopId) {
        filter = { shopId: targetShopId };
      }
    }
    const sales = await Sale.find(filter).sort({ saleDate: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper function to create sale record with custom payment routing
const createSaleRecord = async (req, res, explicitPaymentData = {}) => {
  const { items, totalAmount, totalProfit, cashierName, customerName, shopId } = req.body;
  const rawShopId = req.user?.shopId || shopId;
  const targetShopId = await resolveShopId(rawShopId);
  
  try {
    if (!targetShopId) {
      return res.status(400).json({ message: 'Shop ID is required for sale creation' });
    }

    // 1. Fetch current settings for the invoice
    let settings = await Settings.findOne({ shopId: targetShopId });
    if (!settings) {
      settings = new Settings({ shopId: targetShopId });
      await settings.save();
    }

    // 2. Resolve Payment Breakdown (Cash, Bank, Credit)
    const method = String(explicitPaymentData.paymentMethod || req.body.paymentMethod || 'CASH').toUpperCase();
    const isBank = method === 'BANK_TRANSFER' || method === 'BANK' || method === 'ONLINE' || method === 'EASYPAISA';
    const isCredit = method === 'CREDIT' || method === 'DUE' || explicitPaymentData.isCredit === true;

    const totalAmt = Number(totalAmount) || 0;
    let cashPaid = 0;
    let bankPaid = 0;
    let dueAmount = 0;

    if (req.body.cashPaid !== undefined || req.body.bankPaid !== undefined || req.body.dueAmount !== undefined) {
      cashPaid = Math.max(0, Number(req.body.cashPaid) || 0);
      bankPaid = Math.max(0, Number(req.body.bankPaid) || 0);
      if (req.body.dueAmount !== undefined) {
        dueAmount = Math.max(0, Number(req.body.dueAmount) || 0);
      } else {
        dueAmount = Math.max(0, totalAmt - (cashPaid + bankPaid));
      }
    } else if (method === 'CASH') {
      cashPaid = totalAmt;
      dueAmount = 0;
    } else if (isBank) {
      bankPaid = totalAmt;
      dueAmount = 0;
    } else if (isCredit) {
      dueAmount = totalAmt;
      cashPaid = 0;
      bankPaid = 0;
    } else if (method === 'SPLIT' || method === 'PARTIAL') {
      cashPaid = Number(req.body.cashPaid) || 0;
      bankPaid = Number(req.body.bankPaid) || 0;
      dueAmount = Math.max(0, totalAmt - (cashPaid + bankPaid));
    } else {
      cashPaid = totalAmt;
      dueAmount = 0;
    }

    const paymentReceipt = req.body.paymentReceipt || req.body.paymentProof || explicitPaymentData.paymentReceipt || '';

    // Generate unique serial number (starting from 1)
    const existingCount = await Sale.countDocuments({ shopId: targetShopId });
    const serialNumber = 1 + existingCount;
    const invoiceNumber = `INV-${String(serialNumber).padStart(5, '0')}`;

    const sale = new Sale({
      shopId: targetShopId,
      items,
      totalAmount: totalAmt,
      totalProfit: Number(totalProfit) || 0,
      serialNumber,
      invoiceNumber,
      cashierName: cashierName || req.user?.fullName || "Shop Admin",
      customerName: customerName || (isCredit ? "Credit Customer" : "Walk-in Customer"),
      customerPhone: req.body.customerPhone || "",
      paymentMethod: method,
      cashPaid,
      bankPaid,
      dueAmount,
      paymentReceipt,
      paymentProof: paymentReceipt,
      transactionId: req.body.transactionId || "",
      isCredit: isCredit || dueAmount > 0,
      approvalStatus: req.body.approvalStatus || (isBank ? 'PENDING_APPROVAL' : 'APPROVED')
    });
    
    // 3. Update stock for each item
    for (const item of items) {
      const product = await Item.findById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.name} not found`);
      }
      const qty = Number(item.quantity) || 1;
      if (product.stock < qty) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${product.stock}, Requested: ${qty}`);
      }
      product.stock = Math.max(0, product.stock - qty);
      
      // Also deduct from peti / tray / egg quantity if tracked
      if (product.unitType === 'peti') {
        product.petiQuantity = Math.max(0, (product.petiQuantity || 0) - qty);
      } else if (product.unitType === 'tray') {
        product.trayQuantity = Math.max(0, (product.trayQuantity || 0) - qty);
      } else if (product.unitType === 'egg') {
        product.eggQuantity = Math.max(0, (product.eggQuantity || 0) - qty);
      } else if ((product.petiQuantity || 0) > 0) {
        product.petiQuantity = Math.max(0, product.petiQuantity - qty);
      }

      product.lastUpdated = new Date().toISOString().split('T')[0];
      await product.save();
    }
    
    const newSale = await sale.save();

    // 4. Update active CashSession (Anti-Theft / Reporting)
    if (cashPaid > 0) {
      const activeSession = await CashSession.findOne({ status: 'open' });
      if (activeSession) {
        activeSession.totalSales += cashPaid;
        activeSession.expectedCash += cashPaid;
        await activeSession.save();
      }
    }

    // 5. Generate PDF Invoice
    const fileName = `invoice-${newSale._id}.pdf`;
    const invoicesDir = path.join(__dirname, '..', 'invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    const filePath = path.join(invoicesDir, fileName);
    
    try {
      await generateInvoice(newSale, filePath, settings);
      // Attach invoice URL to response
      const responseData = newSale.toObject();
      responseData.invoiceUrl = `/invoices/${fileName}`;
      res.status(201).json(responseData);
    } catch (pdfErr) {
      console.error("PDF Generation failed:", pdfErr);
      res.status(211).json({ ...newSale.toObject(), message: "Sale created but PDF failed" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Create a standard sale
router.post('/', authenticate, requireShopAdmin, async (req, res) => {
  await createSaleRecord(req, res);
});

// ── DEDICATED ROUTE 1: CASH SALE ──
router.post('/cash', authenticate, requireShopAdmin, async (req, res) => {
  await createSaleRecord(req, res, { paymentMethod: 'CASH' });
});

// ── DEDICATED ROUTE 2: BANK / ONLINE SALE WITH RECEIPT PROOF ──
router.post('/bank', authenticate, requireShopAdmin, async (req, res) => {
  await createSaleRecord(req, res, { paymentMethod: 'BANK_TRANSFER' });
});

router.post('/online', authenticate, requireShopAdmin, async (req, res) => {
  await createSaleRecord(req, res, { paymentMethod: 'ONLINE' });
});

// ── DEDICATED ROUTE 3: CREDIT (DUE BALANCE) SALE ──
router.post('/credit', authenticate, requireShopAdmin, async (req, res) => {
  await createSaleRecord(req, res, { paymentMethod: 'CREDIT', isCredit: true });
});

router.post('/due', authenticate, requireShopAdmin, async (req, res) => {
  await createSaleRecord(req, res, { paymentMethod: 'CREDIT', isCredit: true });
});

// ── SALES BREAKDOWN & SUMMARY ROUTE (Cash, Bank, Credit) ──
router.get('/breakdown/:shopId?', authenticate, async (req, res) => {
  try {
    const rawShopId = req.params.shopId || req.query.shopId || req.user?.shopId;
    let filter = {};
    if (rawShopId) {
      const targetShopId = await resolveShopId(rawShopId);
      if (targetShopId) {
        filter = { shopId: targetShopId };
      }
    }
    const allSales = await Sale.find(filter);

    let totalCash = 0;
    let totalBank = 0;
    let totalCredit = 0;
    let totalGrossSales = 0;

    allSales.forEach(s => {
      totalGrossSales += (Number(s.totalAmount) || 0);
      if (s.cashPaid !== undefined || s.bankPaid !== undefined || s.dueAmount !== undefined) {
        totalCash += (Number(s.cashPaid) || 0);
        totalBank += (Number(s.bankPaid) || 0);
        totalCredit += (Number(s.dueAmount) || 0);
      } else {
        // Fallback for older sales
        const m = String(s.paymentMethod || 'CASH').toUpperCase();
        if (m === 'CASH') totalCash += (Number(s.totalAmount) || 0);
        else if (m === 'BANK_TRANSFER' || m === 'BANK' || m === 'ONLINE' || m === 'EASYPAISA') totalBank += (Number(s.totalAmount) || 0);
        else if (m === 'CREDIT' || m === 'DUE') totalCredit += (Number(s.totalAmount) || 0);
        else totalCash += (Number(s.totalAmount) || 0);
      }
    });

    res.json({
      success: true,
      totalGrossSales,
      totalCash,
      totalBank,
      totalCredit,
      totalCount: allSales.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET SALES FILTERED BY TYPE (cash | bank | credit) ──
router.get('/by-type/:type', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const type = req.params.type.toLowerCase();
    const rawShopId = req.query.shopId || req.user?.shopId;
    let filter = {};
    if (rawShopId) {
      const targetShopId = await resolveShopId(rawShopId);
      if (targetShopId) {
        filter.shopId = targetShopId;
      }
    }

    if (type === 'cash') {
      filter.$or = [{ paymentMethod: 'CASH' }, { cashPaid: { $gt: 0 } }];
    } else if (type === 'bank' || type === 'online') {
      filter.$or = [{ paymentMethod: { $in: ['BANK_TRANSFER', 'BANK', 'ONLINE', 'EASYPAISA'] } }, { bankPaid: { $gt: 0 } }];
    } else if (type === 'credit' || type === 'due') {
      filter.$or = [{ paymentMethod: { $in: ['CREDIT', 'DUE'] } }, { isCredit: true }, { dueAmount: { $gt: 0 } }];
    }

    const sales = await Sale.find(filter).sort({ saleDate: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Return a sale (and reverse stock) - REQUIRE OWNER PASSWORD
router.put('/:id/return', authenticate, preventSuperAdmin, verifyOwnerPassword, async (req, res) => {
  const { reason } = req.body;
  
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale || sale.status === 'returned') {
      return res.status(404).json({ message: 'Sale not found or already returned' });
    }

    // 1. Reverse stock for each item
    for (const item of sale.items) {
      await Item.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }

    // 2. Update sale record
    sale.status = 'returned';
    sale.returnReason = reason || "Customer Return";
    sale.returnDate = new Date();
    const updatedSale = await sale.save();

    // 3. Update active CashSession
    const activeSession = await CashSession.findOne({ status: 'open' });
    if (activeSession) {
      activeSession.totalReturns += sale.totalAmount;
      activeSession.expectedCash -= sale.totalAmount;
      await activeSession.save();
    }

    res.json(updatedSale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Edit a sale (and adjust stock) - REQUIRE OWNER PASSWORD
router.put('/:id', authenticate, preventSuperAdmin, verifyOwnerPassword, async (req, res) => {
  const { items, totalAmount, totalProfit } = req.body;
  
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const oldAmount = sale.totalAmount;

    // Adjust stock based on differences
    for (const newItem of items) {
      const oldItem = sale.items.find(i => i.productId.toString() === newItem.productId.toString());
      if (oldItem) {
        const qtyDifference = newItem.quantity - oldItem.quantity;
        if (qtyDifference !== 0) {
          const product = await Item.findById(newItem.productId);
          if (product) {
            if (qtyDifference > 0 && product.stock < qtyDifference) {
              throw new Error(`Insufficient stock for ${newItem.name}`);
            }
            product.stock -= qtyDifference;
            product.lastUpdated = new Date().toISOString().split('T')[0];
            await product.save();
          }
        }
      }
    }

    // Update the sale record
    sale.items = items;
    sale.totalAmount = totalAmount;
    if (totalProfit !== undefined) {
      sale.totalProfit = totalProfit;
    }
    
    const updatedSale = await sale.save();

    // Update active CashSession
    const activeSession = await CashSession.findOne({ status: 'open' });
    if (activeSession) {
      activeSession.expectedCash += (totalAmount - oldAmount);
      activeSession.totalSales += (totalAmount - oldAmount);
      await activeSession.save();
    }

    res.json(updatedSale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a sale permanently from database (both Sale and Order if exists)
router.delete('/:id', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!targetId) {
      return res.status(400).json({ message: 'Target ID is required' });
    }

    const isValidObjId = mongoose.Types.ObjectId.isValid(targetId);
    let saleQuery = [];
    if (isValidObjId) {
      saleQuery.push({ _id: targetId });
      saleQuery.push({ orderId: targetId });
    }
    saleQuery.push({ invoiceNumber: targetId });

    // 1. Find all matching sales
    const matchingSales = await Sale.find({ $or: saleQuery });

    for (const sale of matchingSales) {
      const amountToDeduct = Number(sale.totalAmount) || 0;

      // Reverse stock
      for (const item of (sale.items || [])) {
        if (item.productId) {
          try {
            await Item.findByIdAndUpdate(item.productId, {
              $inc: { stock: Number(item.quantity) || 1 },
              lastUpdated: new Date().toISOString().split('T')[0]
            });
          } catch (e) { }
        }
      }

      await Sale.findByIdAndDelete(sale._id);

      // Delete associated Invoice PDF if it exists
      const fileName = `invoice-${sale._id}.pdf`;
      const filePath = path.join(__dirname, '..', 'invoices', fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) { }
      }

      // Update active CashSession
      const activeSession = await CashSession.findOne({ status: 'open' });
      if (activeSession) {
        activeSession.totalSales = Math.max(0, (activeSession.totalSales || 0) - amountToDeduct);
        activeSession.expectedCash = Math.max(0, (activeSession.expectedCash || 0) - amountToDeduct);
        await activeSession.save();
      }

      // Delete linked order if any
      if (sale.orderId) {
        try {
          await Order.findByIdAndDelete(sale.orderId);
        } catch (e) { }
      }
    }

    // 2. Also delete directly from Order collection
    if (isValidObjId) {
      try {
        await Order.findByIdAndDelete(targetId);
      } catch (ordErr) { }
    }
    try {
      await Order.deleteMany({
        $or: [
          ...(isValidObjId ? [{ _id: targetId }] : []),
          { orderNumber: targetId }
        ]
      });
    } catch (e) { }

    res.json({ success: true, message: 'Sale and associated records permanently deleted from database' });
  } catch (err) {
    console.error('Delete sale error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Approve or Reject Bank Transfer Sale
router.patch('/:id/approve', authenticate, requireShopAdmin, async (req, res) => {
  try {
    const { approvalStatus = 'APPROVED' } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    sale.approvalStatus = approvalStatus;
    await sale.save();
    res.json({ success: true, message: `Sale ${approvalStatus.toLowerCase()} successfully`, sale });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper logic for executing credit settlement
const processCreditSettlement = async (saleId, { paymentMethod = 'CASH', amountPaid, transactionId, paymentProof, paymentReceipt }, res) => {
  try {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const currentDue = Number(sale.dueAmount) > 0 ? Number(sale.dueAmount) : Number(sale.totalAmount);
    const settleAmount = amountPaid ? Math.min(Number(amountPaid), currentDue) : currentDue;

    if (settleAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const method = String(paymentMethod).toUpperCase();
    const isBank = method === 'BANK_TRANSFER' || method === 'BANK' || method === 'ONLINE' || method === 'EASYPAISA';

    if (isBank) {
      sale.bankPaid = (Number(sale.bankPaid) || 0) + settleAmount;
      if (transactionId) sale.transactionId = transactionId;
      if (paymentProof || paymentReceipt) {
        sale.paymentProof = paymentProof || paymentReceipt;
        sale.paymentReceipt = paymentProof || paymentReceipt;
      }
    } else {
      // CASH
      sale.cashPaid = (Number(sale.cashPaid) || 0) + settleAmount;
      
      // Update active CashSession
      const activeSession = await CashSession.findOne({ status: 'open' });
      if (activeSession) {
        activeSession.totalSales = (Number(activeSession.totalSales) || 0) + settleAmount;
        activeSession.expectedCash = (Number(activeSession.expectedCash) || 0) + settleAmount;
        await activeSession.save();
      }
    }

    const newDue = Math.max(0, currentDue - settleAmount);
    sale.dueAmount = newDue;
    sale.isCredit = newDue > 0;
    
    // If fully paid, update paymentMethod according to what was paid
    if (newDue === 0) {
      if ((Number(sale.bankPaid) || 0) > 0 && (Number(sale.cashPaid) || 0) === 0) {
        sale.paymentMethod = 'BANK_TRANSFER';
      } else if ((Number(sale.cashPaid) || 0) > 0 && (Number(sale.bankPaid) || 0) === 0) {
        sale.paymentMethod = 'CASH';
      } else if ((Number(sale.cashPaid) || 0) > 0 && (Number(sale.bankPaid) || 0) > 0) {
        sale.paymentMethod = 'SPLIT';
      } else {
        sale.paymentMethod = isBank ? 'BANK_TRANSFER' : 'CASH';
      }
    }

    await sale.save();

    // Also update Order if it corresponds to an order
    try {
      const order = await Order.findById(saleId);
      if (order) {
        if (newDue === 0) {
          order.paymentStatus = 'PAID';
        }
        order.paymentMethod = sale.paymentMethod;
        await order.save();
      }
    } catch (e) { }

    return res.json({
      success: true,
      message: `Credit of Rs. ${settleAmount.toLocaleString('en-PK')} settled via ${isBank ? 'Bank Transfer' : 'Cash'}`,
      sale
    });
  } catch (err) {
    console.error('Settle credit error:', err);
    return res.status(500).json({ message: err.message });
  }
};

// ── DEDICATED ROUTE 1: SETTLE CREDIT VIA CASH ──
router.patch('/:id/settle-cash', authenticate, requireShopAdmin, async (req, res) => {
  await processCreditSettlement(req.params.id, { ...req.body, paymentMethod: 'CASH' }, res);
});

// ── DEDICATED ROUTE 2: SETTLE CREDIT VIA BANK TRANSFER ──
router.patch('/:id/settle-bank', authenticate, requireShopAdmin, async (req, res) => {
  await processCreditSettlement(req.params.id, { ...req.body, paymentMethod: 'BANK_TRANSFER' }, res);
});

// ── UNIFIED ROUTE: SETTLE CREDIT (Dynamic Cash or Bank) ──
router.patch('/:id/settle-credit', authenticate, requireShopAdmin, async (req, res) => {
  await processCreditSettlement(req.params.id, req.body, res);
});

export default router;

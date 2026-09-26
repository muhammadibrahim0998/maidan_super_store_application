import express from 'express';
import EasypaisaOrder from '../models/EasypaisaOrder.js';
import { pool } from '../config/mysql.js';

const router = express.Router();

// ─── GET all EasyPaisa orders for a shop ─────────────────────────────────────
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, limit = 100, page = 1 } = req.query;

    let sql = `SELECT * FROM easypaisa_orders WHERE shopId = ?`;
    const params = [shopId];

    if (status && status !== 'ALL') {
      sql += ` AND paymentStatus = ?`;
      params.push(status);
    }

    sql += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await pool.query(sql, params);

    // Parse JSON fields
    const orders = rows.map(row => {
      try { row.items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []); } catch { row.items = []; }
      try { row.shippingDetails = typeof row.shippingDetails === 'string' ? JSON.parse(row.shippingDetails || '{}') : (row.shippingDetails || {}); } catch { row.shippingDetails = {}; }
      row._id = String(row.id);
      return row;
    });

    // Count totals
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM easypaisa_orders WHERE shopId = ?`, [shopId]);
    const [[{ totalAmount }]] = await pool.query(`SELECT COALESCE(SUM(totalAmount),0) as totalAmount FROM easypaisa_orders WHERE shopId = ? AND paymentStatus = 'PAID'`, [shopId]);
    const [[{ pendingCount }]] = await pool.query(`SELECT COUNT(*) as pendingCount FROM easypaisa_orders WHERE shopId = ? AND paymentStatus = 'PENDING'`, [shopId]);

    res.json({
      success: true,
      orders,
      total: Number(total),
      totalRevenue: Number(totalAmount),
      pendingCount: Number(pendingCount)
    });
  } catch (err) {
    console.error('EasyPaisa orders fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET single EasyPaisa order ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM easypaisa_orders WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Order not found' });
    const row = rows[0];
    try { row.items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []); } catch { row.items = []; }
    try { row.shippingDetails = typeof row.shippingDetails === 'string' ? JSON.parse(row.shippingDetails || '{}') : (row.shippingDetails || {}); } catch { row.shippingDetails = {}; }
    row._id = String(row.id);
    res.json({ success: true, order: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST create new EasyPaisa order ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      shopId, customerId, customerName, customerPhone, customerEmail,
      items, totalAmount, shippingDetails, paymentMethod = 'EASYPAISA',
      paymentStatus = 'PENDING', orderStatus = 'PROCESSING',
      transactionId, senderNumber, paymentProof, notes
    } = req.body;

    if (!shopId || !totalAmount) {
      return res.status(400).json({ success: false, message: 'shopId and totalAmount are required' });
    }

    const order = new EasypaisaOrder({
      shopId, customerId, customerName, customerPhone, customerEmail,
      items, totalAmount, shippingDetails, paymentMethod,
      paymentStatus, orderStatus, transactionId, senderNumber,
      paymentProof, notes
    });

    await order.save();
    res.status(201).json({ success: true, order: order.toObject(), message: 'EasyPaisa order created successfully' });
  } catch (err) {
    console.error('Create EasyPaisa order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT update EasyPaisa order (approve/reject payment) ─────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [existing] = await pool.query(`SELECT * FROM easypaisa_orders WHERE id = ?`, [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Order not found' });

    // Build update query dynamically
    const allowedFields = [
      'paymentStatus', 'orderStatus', 'transactionId', 'senderNumber',
      'paymentProof', 'notes', 'customerName', 'customerPhone',
      'totalAmount', 'updatedAt'
    ];
    const setClauses = [];
    const values = [];

    for (const [key, val] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`\`${key}\` = ?`);
        values.push(val);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    setClauses.push('`updatedAt` = NOW()');
    values.push(id);

    await pool.query(`UPDATE easypaisa_orders SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query(`SELECT * FROM easypaisa_orders WHERE id = ?`, [id]);
    const row = updated[0];
    try { row.items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []); } catch { row.items = []; }
    try { row.shippingDetails = typeof row.shippingDetails === 'string' ? JSON.parse(row.shippingDetails || '{}') : (row.shippingDetails || {}); } catch { row.shippingDetails = {}; }
    row._id = String(row.id);

    res.json({ success: true, order: row, message: 'Order updated successfully' });
  } catch (err) {
    console.error('Update EasyPaisa order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE EasyPaisa order ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM easypaisa_orders WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST sync from old orders table to easypaisa_orders ─────────────────────
router.post('/sync/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    // Fetch EasyPaisa orders from old orders table
    const [oldOrders] = await pool.query(
      `SELECT * FROM \`orders\` WHERE shopId = ? AND paymentMethod IN ('EASYPAISA','JAZZCASH','ONLINE') ORDER BY createdAt DESC`,
      [shopId]
    );

    let synced = 0;
    for (const o of oldOrders) {
      // Check if already synced
      const [exists] = await pool.query(
        `SELECT id FROM easypaisa_orders WHERE shopId = ? AND transactionId = ? AND totalAmount = ?`,
        [shopId, o.transactionId || '', o.totalAmount]
      );
      if (exists.length) continue;

      let items = o.items;
      try { if (typeof items === 'string') items = JSON.parse(items || '[]'); } catch { items = []; }
      let shipping = o.shippingDetails;
      try { if (typeof shipping === 'string') shipping = JSON.parse(shipping || '{}'); } catch { shipping = {}; }

      await pool.query(`
        INSERT INTO easypaisa_orders 
        (shopId, customerId, customerName, customerPhone, items, totalAmount, shippingDetails, 
         paymentMethod, paymentStatus, orderStatus, transactionId, senderNumber, paymentProof, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        shopId,
        o.customerId || null,
        shipping?.fullName || shipping?.name || '',
        shipping?.phone || '',
        JSON.stringify(items),
        o.totalAmount,
        JSON.stringify(shipping),
        o.paymentMethod || 'EASYPAISA',
        o.paymentStatus || 'PENDING',
        o.orderStatus || 'PROCESSING',
        o.transactionId || '',
        '',
        o.paymentProof || '',
        o.createdAt || new Date(),
        o.updatedAt || new Date()
      ]);
      synced++;
    }

    res.json({ success: true, message: `Synced ${synced} EasyPaisa orders from old orders table`, synced });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

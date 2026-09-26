import express from 'express';
import Purchase from '../models/Purchase.js';
import { pool } from '../config/mysql.js';

const router = express.Router();

// ─── GET all purchases for a shop ────────────────────────────────────────────
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, restockType, limit = 200, page = 1 } = req.query;

    let sql = `SELECT * FROM purchases WHERE shopId = ?`;
    const params = [shopId];

    if (status && status !== 'ALL') {
      sql += ` AND paymentStatus = ?`;
      params.push(status);
    }

    if (restockType && restockType !== 'ALL') {
      sql += ` AND restockType = ?`;
      params.push(restockType);
    }

    sql += ` ORDER BY purchaseDate DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await pool.query(sql, params);
    const purchases = rows.map(row => { row._id = String(row.id); return row; });

    // Summary stats
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM purchases WHERE shopId = ?`, [shopId]);
    const [[{ totalCost }]] = await pool.query(`SELECT COALESCE(SUM(totalCost),0) as totalCost FROM purchases WHERE shopId = ?`, [shopId]);
    const [[{ totalPaid }]] = await pool.query(`SELECT COALESCE(SUM(amountPaid),0) as totalPaid FROM purchases WHERE shopId = ?`, [shopId]);
    const [[{ totalDue }]] = await pool.query(`SELECT COALESCE(SUM(dueAmount),0) as totalDue FROM purchases WHERE shopId = ?`, [shopId]);

    res.json({
      success: true,
      purchases,
      total: Number(total),
      totalCost: Number(totalCost),
      totalPaid: Number(totalPaid),
      totalDue: Number(totalDue)
    });
  } catch (err) {
    console.error('Purchases fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET single purchase ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM purchases WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Purchase not found' });
    const row = rows[0];
    row._id = String(row.id);
    res.json({ success: true, purchase: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST create new purchase/restock ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      shopId, productName, productId, category,
      supplierName, supplierPhone, supplierAddress,
      quantity, unitType, petiQuantity, trayQuantity, eggQuantity,
      unitPrice, totalCost, amountPaid, cashPaid, bankPaid, dueAmount,
      paymentMethod, paymentStatus, invoiceNumber, purchaseDate,
      restockType, notes, createdBy
    } = req.body;

    if (!shopId || !productName) {
      return res.status(400).json({ success: false, message: 'shopId and productName are required' });
    }

    const purchase = new Purchase({
      shopId, productName, productId, category,
      supplierName, supplierPhone, supplierAddress,
      quantity, unitType, petiQuantity, trayQuantity, eggQuantity,
      unitPrice, totalCost, amountPaid, cashPaid, bankPaid,
      dueAmount: dueAmount ?? (Number(totalCost || 0) - Number(amountPaid || 0)),
      paymentMethod, paymentStatus, invoiceNumber,
      purchaseDate: purchaseDate || new Date(),
      restockType, notes,
      createdBy: createdBy || 'Shop Admin'
    });

    await purchase.save();
    res.status(201).json({ success: true, purchase: purchase.toObject(), message: 'Purchase recorded successfully' });
  } catch (err) {
    console.error('Create purchase error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT update purchase ──────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [existing] = await pool.query(`SELECT * FROM purchases WHERE id = ?`, [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const allowedFields = [
      'productName', 'category', 'supplierName', 'supplierPhone', 'supplierAddress',
      'quantity', 'unitType', 'petiQuantity', 'trayQuantity', 'eggQuantity',
      'unitPrice', 'totalCost', 'amountPaid', 'cashPaid', 'bankPaid', 'dueAmount',
      'paymentMethod', 'paymentStatus', 'invoiceNumber', 'purchaseDate',
      'restockType', 'notes'
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

    await pool.query(`UPDATE purchases SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query(`SELECT * FROM purchases WHERE id = ?`, [id]);
    const row = updated[0];
    row._id = String(row.id);

    res.json({ success: true, purchase: row, message: 'Purchase updated successfully' });
  } catch (err) {
    console.error('Update purchase error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE purchase ──────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM purchases WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST sync purchases from items table ─────────────────────────────────────
router.post('/sync/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    // Fetch items that have purchase/supplier data
    const [items] = await pool.query(
      `SELECT * FROM items WHERE shopId = ? AND (supplierName != '' OR totalPurchaseCost > 0) ORDER BY createdAt ASC`,
      [shopId]
    );

    let synced = 0;
    for (const item of items) {
      // Check if already synced (by productId)
      const [exists] = await pool.query(
        `SELECT id FROM purchases WHERE shopId = ? AND productId = ? AND productName = ?`,
        [shopId, item.id, item.name]
      );
      if (exists.length) continue;

      const petiQty = Number(item.petiQuantity) || 0;
      const totalCost = Number(item.totalPurchaseCost) || (Number(item.costPrice) * Number(item.stock || petiQty));
      const amtPaid = Number(item.amountPaidToSupplier) || totalCost;
      const dueAmt = Number(item.dueAmountToSupplier) || 0;

      await pool.query(`
        INSERT INTO purchases 
        (shopId, productName, productId, category, supplierName, supplierPhone, supplierAddress,
         quantity, unitType, petiQuantity, eggQuantity, unitPrice, totalCost, amountPaid, cashPaid,
         bankPaid, dueAmount, paymentMethod, paymentStatus, invoiceNumber, purchaseDate, restockType, createdBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        shopId,
        item.name,
        item.id,
        item.category || '',
        item.supplierName || '',
        item.supplierPhone || '',
        item.supplierAddress || '',
        Number(item.stock) || 0,
        item.unitType || 'unit',
        petiQty,
        Number(item.eggQuantity) || petiQty * 360,
        Number(item.costPrice) || 0,
        totalCost,
        amtPaid,
        item.paymentMethod === 'CASH' ? amtPaid : 0,
        item.paymentMethod !== 'CASH' ? amtPaid : 0,
        dueAmt,
        item.paymentMethod || 'CASH',
        dueAmt > 0 ? 'PARTIAL' : 'PAID',
        item.supplierInvoiceNo || '',
        item.supplierInvoiceDate || item.createdAt || new Date(),
        'NEW_STOCK',
        'Shop Admin',
        item.createdAt || new Date(),
        item.updatedAt || new Date()
      ]);
      synced++;
    }

    res.json({ success: true, message: `Synced ${synced} purchases from items table`, synced });
  } catch (err) {
    console.error('Sync purchases error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

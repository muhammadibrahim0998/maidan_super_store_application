import express from 'express';
import { pool } from '../config/mysql.js';

const router = express.Router();

// ─── GET all purchase credits for a shop ──────────────────────────────────────
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, search, limit = 200, page = 1 } = req.query;

    let sql = `SELECT * FROM purchase_credits WHERE shopId = ?`;
    const params = [shopId];

    if (status && status !== 'ALL') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ` AND (supplierName LIKE ? OR supplierPhone LIKE ? OR billNumber LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY creditDate DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await pool.query(sql, params);
    const credits = rows.map(r => ({ ...r, _id: String(r.id) }));

    // Overall summary statistics
    const [[{ totalCredits }]] = await pool.query(
      `SELECT COUNT(*) as totalCredits FROM purchase_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ totalAmount }]] = await pool.query(
      `SELECT COALESCE(SUM(totalAmount), 0) as totalAmount FROM purchase_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ totalPaidAmount }]] = await pool.query(
      `SELECT COALESCE(SUM(amountPaid), 0) as totalPaidAmount FROM purchase_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ totalDueBalance }]] = await pool.query(
      `SELECT COALESCE(SUM(dueBalance), 0) as totalDueBalance FROM purchase_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ activeCreditors }]] = await pool.query(
      `SELECT COUNT(DISTINCT supplierName) as activeCreditors FROM purchase_credits WHERE shopId = ? AND dueBalance > 0`, [shopId]
    );

    res.json({
      success: true,
      credits,
      totalCredits: Number(totalCredits),
      totalAmount: Number(totalAmount),
      totalPaidAmount: Number(totalPaidAmount),
      totalDueBalance: Number(totalDueBalance),
      activeCreditors: Number(activeCreditors)
    });
  } catch (err) {
    console.error('Purchase credits fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET single purchase credit with payment history ──────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM purchase_credits WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Credit record not found' });
    const credit = { ...rows[0], _id: String(rows[0].id) };

    const [payments] = await pool.query(
      `SELECT * FROM purchase_credit_payments WHERE creditId = ? ORDER BY paymentDate DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      credit,
      payments: payments.map(p => ({ ...p, _id: String(p.id) }))
    });
  } catch (err) {
    console.error('Single purchase credit fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CREATE new purchase credit record ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      shopId = 1,
      purchaseId = null,
      supplierName,
      supplierPhone = '',
      supplierAddress = '',
      billNumber = '',
      totalAmount = 0,
      amountPaid = 0,
      dueDate = null,
      notes = '',
      createdBy = 'Shop Admin'
    } = req.body;

    if (!supplierName || !supplierName.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const total = Number(totalAmount) || 0;
    const paid = Number(amountPaid) || 0;
    const due = Math.max(0, total - paid);
    const status = due === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');
    const bill = billNumber || `BILL-${Date.now().toString().slice(-6)}`;

    const [result] = await pool.query(`
      INSERT INTO purchase_credits (
        shopId, purchaseId, supplierName, supplierPhone, supplierAddress,
        billNumber, totalAmount, amountPaid, dueBalance,
        dueDate, status, notes, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shopId, purchaseId, supplierName.trim(), supplierPhone.trim(), supplierAddress.trim(),
      bill, total, paid, due,
      dueDate || null, status, notes.trim(), createdBy
    ]);

    const creditId = result.insertId;

    // If an initial payment was made, log it
    if (paid > 0) {
      await pool.query(`
        INSERT INTO purchase_credit_payments (
          creditId, shopId, supplierName, amountPaid, paymentMethod,
          receiptNumber, paidBy, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        creditId, shopId, supplierName.trim(), paid, req.body.paymentMethod || 'CASH',
        `VOUCH-${Date.now().toString().slice(-6)}`, createdBy, 'Initial payment at bill entry'
      ]);
    }

    const [created] = await pool.query(`SELECT * FROM purchase_credits WHERE id = ?`, [creditId]);

    res.status(201).json({
      success: true,
      message: 'Purchase credit recorded successfully',
      credit: { ...created[0], _id: String(created[0].id) }
    });
  } catch (err) {
    console.error('Purchase credit creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── RECORD PAYMENT TO SUPPLIER for purchase credit ───────────────────────────
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amountPaid,
      paymentMethod = 'CASH',
      transactionId = '',
      receiptNumber = '',
      paidBy = 'Shop Admin',
      notes = ''
    } = req.body;

    const payAmt = Number(amountPaid);
    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const [rows] = await pool.query(`SELECT * FROM purchase_credits WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Credit record not found' });
    const credit = rows[0];

    const currentDue = Number(credit.dueBalance);
    if (payAmt > currentDue) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (Rs. ${payAmt}) exceeds remaining payable balance (Rs. ${currentDue})`
      });
    }

    const newAmountPaid = Number(credit.amountPaid) + payAmt;
    const newDueBalance = Math.max(0, currentDue - payAmt);
    const newStatus = newDueBalance === 0 ? 'PAID' : 'PARTIAL';
    const vouchNo = receiptNumber || `VOUCH-${Date.now().toString().slice(-6)}`;

    // 1. Record payment history
    await pool.query(`
      INSERT INTO purchase_credit_payments (
        creditId, shopId, supplierName, amountPaid, paymentMethod,
        receiptNumber, transactionId, paidBy, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, credit.shopId, credit.supplierName, payAmt, paymentMethod,
      vouchNo, transactionId, paidBy, notes
    ]);

    // 2. Update purchase_credits record
    await pool.query(`
      UPDATE purchase_credits
      SET amountPaid = ?, dueBalance = ?, status = ?
      WHERE id = ?
    `, [newAmountPaid, newDueBalance, newStatus, id]);

    // 3. If linked to purchases table, update purchases record as well
    if (credit.purchaseId) {
      try {
        const [pRows] = await pool.query(`SELECT * FROM purchases WHERE id = ?`, [credit.purchaseId]);
        if (pRows.length > 0) {
          const p = pRows[0];
          const updatedPaid = Number(p.amountPaid || 0) + payAmt;
          const updatedDue = Math.max(0, Number(p.dueAmount || 0) - payAmt);
          const updatedStatus = updatedDue === 0 ? 'PAID' : 'PARTIAL';
          await pool.query(`
            UPDATE purchases
            SET amountPaid = ?, dueAmount = ?, paymentStatus = ?
            WHERE id = ?
          `, [updatedPaid, updatedDue, updatedStatus, credit.purchaseId]);
        }
      } catch (err) {
        console.warn('Sync back to purchases warning:', err);
      }
    }

    const [updated] = await pool.query(`SELECT * FROM purchase_credits WHERE id = ?`, [id]);
    const [payments] = await pool.query(`SELECT * FROM purchase_credit_payments WHERE creditId = ? ORDER BY paymentDate DESC`, [id]);

    res.json({
      success: true,
      message: `Supplier payment of Rs. ${payAmt.toLocaleString()} recorded successfully!`,
      credit: { ...updated[0], _id: String(updated[0].id) },
      payments: payments.map(p => ({ ...p, _id: String(p.id) }))
    });
  } catch (err) {
    console.error('Supplier payment record error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SYNC UNPAID PURCHASES from purchases table ───────────────────────────────
router.post('/sync/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    // Find purchases with dueAmount > 0 or paymentStatus != 'PAID'
    const [unpaidPurchases] = await pool.query(`
      SELECT * FROM purchases
      WHERE shopId = ? AND (dueAmount > 0 OR paymentStatus != 'PAID')
    `, [shopId]);

    let syncedCount = 0;
    for (const p of unpaidPurchases) {
      // Check if already in purchase_credits
      const [existing] = await pool.query(`
        SELECT id FROM purchase_credits WHERE purchaseId = ?
      `, [p.id]);

      if (existing.length === 0) {
        const total = Number(p.totalCost) || 0;
        const paid = Number(p.amountPaid) || 0;
        const due = Number(p.dueAmount !== undefined ? p.dueAmount : Math.max(0, total - paid));
        const status = due === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');

        const [ins] = await pool.query(`
          INSERT INTO purchase_credits (
            shopId, purchaseId, supplierName, supplierPhone, supplierAddress,
            billNumber, totalAmount, amountPaid, dueBalance,
            creditDate, status, notes, createdBy
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          shopId, p.id, p.supplierName || 'General Supplier',
          p.supplierPhone || '', p.supplierAddress || '', p.invoiceNumber || `PUR-${p.id}`,
          total, paid, due, p.purchaseDate || new Date(),
          status, `Synced from Purchase #${p.id} (${p.productName || 'Stock'})`, p.createdBy || 'Shop Admin'
        ]);

        if (paid > 0) {
          await pool.query(`
            INSERT INTO purchase_credit_payments (
              creditId, shopId, supplierName, amountPaid, paymentMethod,
              receiptNumber, paidBy, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            ins.insertId, shopId, p.supplierName || 'General Supplier', paid,
            p.paymentMethod || 'CASH', `VOUCH-INIT-${p.id}`,
            p.createdBy || 'Shop Admin', 'Initial payment recorded during purchase'
          ]);
        }
        syncedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} supplier purchase credits`,
      syncedCount
    });
  } catch (err) {
    console.error('Purchase credits sync error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE purchase credit record ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM purchase_credit_payments WHERE creditId = ?`, [id]);
    const [result] = await pool.query(`DELETE FROM purchase_credits WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Credit record not found' });
    }
    res.json({ success: true, message: 'Purchase credit deleted successfully' });
  } catch (err) {
    console.error('Purchase credit delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

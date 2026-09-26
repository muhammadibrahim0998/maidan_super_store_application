import express from 'express';
import { pool } from '../config/mysql.js';

const router = express.Router();

// ─── GET all customer credits for a shop ──────────────────────────────────────
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, search, limit = 200, page = 1 } = req.query;

    let sql = `SELECT * FROM customer_credits WHERE shopId = ?`;
    const params = [shopId];

    if (status && status !== 'ALL') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ` AND (customerName LIKE ? OR customerPhone LIKE ? OR invoiceNumber LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY creditDate DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await pool.query(sql, params);
    const credits = rows.map(r => ({ ...r, _id: String(r.id) }));

    // Overall summary statistics
    const [[{ totalCredits }]] = await pool.query(
      `SELECT COUNT(*) as totalCredits FROM customer_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ totalCreditAmount }]] = await pool.query(
      `SELECT COALESCE(SUM(totalCredit), 0) as totalCreditAmount FROM customer_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ totalPaidAmount }]] = await pool.query(
      `SELECT COALESCE(SUM(amountPaid), 0) as totalPaidAmount FROM customer_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ totalDueBalance }]] = await pool.query(
      `SELECT COALESCE(SUM(dueBalance), 0) as totalDueBalance FROM customer_credits WHERE shopId = ?`, [shopId]
    );
    const [[{ activeDebtors }]] = await pool.query(
      `SELECT COUNT(DISTINCT customerName) as activeDebtors FROM customer_credits WHERE shopId = ? AND dueBalance > 0`, [shopId]
    );

    res.json({
      success: true,
      credits,
      totalCredits: Number(totalCredits),
      totalCreditAmount: Number(totalCreditAmount),
      totalPaidAmount: Number(totalPaidAmount),
      totalDueBalance: Number(totalDueBalance),
      activeDebtors: Number(activeDebtors)
    });
  } catch (err) {
    console.error('Customer credits fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET single customer credit with payment history ─────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM customer_credits WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Credit record not found' });
    const credit = { ...rows[0], _id: String(rows[0].id) };

    const [payments] = await pool.query(
      `SELECT * FROM customer_credit_payments WHERE creditId = ? ORDER BY paymentDate DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      credit,
      payments: payments.map(p => ({ ...p, _id: String(p.id) }))
    });
  } catch (err) {
    console.error('Single customer credit fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CREATE new customer credit record ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      shopId = 1,
      customerId = null,
      customerName,
      customerPhone = '',
      customerAddress = '',
      saleId = null,
      invoiceNumber = '',
      totalCredit = 0,
      amountPaid = 0,
      dueDate = null,
      notes = '',
      createdBy = 'Shop Admin'
    } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const total = Number(totalCredit) || 0;
    const paid = Number(amountPaid) || 0;
    const due = Math.max(0, total - paid);
    const status = due === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');
    const inv = invoiceNumber || `CR-${Date.now().toString().slice(-6)}`;

    const [result] = await pool.query(`
      INSERT INTO customer_credits (
        shopId, customerId, customerName, customerPhone, customerAddress,
        saleId, invoiceNumber, totalCredit, amountPaid, dueBalance,
        dueDate, status, notes, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shopId, customerId, customerName.trim(), customerPhone.trim(), customerAddress.trim(),
      saleId, inv, total, paid, due,
      dueDate || null, status, notes.trim(), createdBy
    ]);

    const creditId = result.insertId;

    // If an initial payment was made, log it in payments table
    if (paid > 0) {
      await pool.query(`
        INSERT INTO customer_credit_payments (
          creditId, shopId, customerName, amountPaid, paymentMethod,
          receiptNumber, receivedBy, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        creditId, shopId, customerName.trim(), paid, req.body.paymentMethod || 'CASH',
        `REC-${Date.now().toString().slice(-6)}`, createdBy, 'Initial payment at credit creation'
      ]);
    }

    const [created] = await pool.query(`SELECT * FROM customer_credits WHERE id = ?`, [creditId]);

    res.status(201).json({
      success: true,
      message: 'Customer credit recorded successfully',
      credit: { ...created[0], _id: String(created[0].id) }
    });
  } catch (err) {
    console.error('Customer credit creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── RECORD INSTALLMENT / PAYMENT for customer credit ─────────────────────────
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amountPaid,
      paymentMethod = 'CASH',
      transactionId = '',
      receiptNumber = '',
      receivedBy = 'Shop Admin',
      notes = ''
    } = req.body;

    const payAmt = Number(amountPaid);
    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const [rows] = await pool.query(`SELECT * FROM customer_credits WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Credit record not found' });
    const credit = rows[0];

    const currentDue = Number(credit.dueBalance);
    if (payAmt > currentDue) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (Rs. ${payAmt}) exceeds remaining due balance (Rs. ${currentDue})`
      });
    }

    const newAmountPaid = Number(credit.amountPaid) + payAmt;
    const newDueBalance = Math.max(0, currentDue - payAmt);
    const newStatus = newDueBalance === 0 ? 'PAID' : 'PARTIAL';
    const recNo = receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

    // 1. Record payment history
    await pool.query(`
      INSERT INTO customer_credit_payments (
        creditId, shopId, customerName, amountPaid, paymentMethod,
        receiptNumber, transactionId, receivedBy, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, credit.shopId, credit.customerName, payAmt, paymentMethod,
      recNo, transactionId, receivedBy, notes
    ]);

    // 2. Update credit record
    await pool.query(`
      UPDATE customer_credits
      SET amountPaid = ?, dueBalance = ?, status = ?
      WHERE id = ?
    `, [newAmountPaid, newDueBalance, newStatus, id]);

    // 3. If linked to a sale, sync back to sales table
    if (credit.saleId) {
      try {
        const [saleRows] = await pool.query(`SELECT * FROM sales WHERE id = ?`, [credit.saleId]);
        if (saleRows.length > 0) {
          const s = saleRows[0];
          const updatedCash = paymentMethod === 'CASH' ? (Number(s.cashPaid || 0) + payAmt) : (s.cashPaid || 0);
          const updatedBank = (paymentMethod === 'BANK' || paymentMethod === 'EASYPAISA' || paymentMethod === 'ONLINE')
            ? (Number(s.bankPaid || 0) + payAmt) : (s.bankPaid || 0);
          await pool.query(`
            UPDATE sales
            SET dueAmount = ?, isCredit = ?, cashPaid = ?, bankPaid = ?
            WHERE id = ?
          `, [newDueBalance, newDueBalance > 0 ? 1 : 0, updatedCash, updatedBank, credit.saleId]);
        }
      } catch (err) {
        console.warn('Sync back to sale warning:', err);
      }
    }

    const [updated] = await pool.query(`SELECT * FROM customer_credits WHERE id = ?`, [id]);
    const [payments] = await pool.query(`SELECT * FROM customer_credit_payments WHERE creditId = ? ORDER BY paymentDate DESC`, [id]);

    res.json({
      success: true,
      message: `Payment of Rs. ${payAmt.toLocaleString()} recorded successfully!`,
      credit: { ...updated[0], _id: String(updated[0].id) },
      payments: payments.map(p => ({ ...p, _id: String(p.id) }))
    });
  } catch (err) {
    console.error('Payment record error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SYNC CREDIT SALES from sales table ───────────────────────────────────────
router.post('/sync/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    // Find sales where isCredit = 1 OR dueAmount > 0
    const [creditSales] = await pool.query(`
      SELECT * FROM sales
      WHERE shopId = ? AND (isCredit = 1 OR dueAmount > 0)
    `, [shopId]);

    let syncedCount = 0;
    for (const sale of creditSales) {
      // Check if already in customer_credits
      const [existing] = await pool.query(`
        SELECT id FROM customer_credits WHERE saleId = ?
      `, [sale.id]);

      if (existing.length === 0) {
        const total = Number(sale.totalAmount) || 0;
        const due = Number(sale.dueAmount !== undefined ? sale.dueAmount : total);
        const paid = Math.max(0, total - due);
        const status = due === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');

        const [ins] = await pool.query(`
          INSERT INTO customer_credits (
            shopId, customerId, customerName, customerPhone, saleId,
            invoiceNumber, totalCredit, amountPaid, dueBalance,
            creditDate, status, notes, createdBy
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          shopId, sale.customerId || null, sale.customerName || 'Walk-in Credit Customer',
          sale.customerPhone || '', sale.id, sale.invoiceNumber || `INV-${sale.id}`,
          total, paid, due, sale.saleDate || new Date(),
          status, `Synced from POS Sale #${sale.id}`, sale.cashierName || 'Shop Admin'
        ]);

        if (paid > 0) {
          await pool.query(`
            INSERT INTO customer_credit_payments (
              creditId, shopId, customerName, amountPaid, paymentMethod,
              receiptNumber, receivedBy, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            ins.insertId, shopId, sale.customerName || 'Walk-in Customer', paid,
            sale.paymentMethod || 'CASH', `REC-INIT-${sale.id}`,
            sale.cashierName || 'Shop Admin', 'Initial payment from sale'
          ]);
        }
        syncedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} credit sales into Customer Credit ledger`,
      syncedCount
    });
  } catch (err) {
    console.error('Customer credits sync error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE customer credit record ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM customer_credit_payments WHERE creditId = ?`, [id]);
    const [result] = await pool.query(`DELETE FROM customer_credits WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Credit record not found' });
    }
    res.json({ success: true, message: 'Customer credit deleted successfully' });
  } catch (err) {
    console.error('Customer credit delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

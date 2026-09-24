import express from 'express';
import Expense from '../models/Expense.js';
import { resolveShopId } from '../utils/shopResolver.js';

const router = express.Router();

// GET all expenses for a shop
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const realShopId = await resolveShopId(shopId);
    const expenses = await Expense.find({ shopId: realShopId }).sort({ expenseDate: -1 });
    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST add a new expense for a shop
router.post('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const realShopId = await resolveShopId(shopId);
    const { title, category, amount, paymentMethod, paymentSource, expenseDate, notes, createdBy } = req.body;

    if (!title || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    const source = (paymentSource || paymentMethod || 'CASH').toUpperCase().includes('BANK') ? 'BANK' : 'CASH';

    const newExpense = new Expense({
      shopId: realShopId,
      title,
      category: category || 'Other',
      amount: Number(amount),
      paymentMethod: source,
      paymentSource: source,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: notes || '',
      createdBy: createdBy || 'Shop Admin'
    });

    await newExpense.save();
    res.status(201).json({ success: true, data: newExpense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update an expense by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, amount, paymentMethod, paymentSource, expenseDate, notes, createdBy } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (paymentMethod !== undefined || paymentSource !== undefined) {
      const source = (paymentSource || paymentMethod || 'CASH').toUpperCase().includes('BANK') ? 'BANK' : 'CASH';
      updateData.paymentMethod = source;
      updateData.paymentSource = source;
    }
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);
    if (notes !== undefined) updateData.notes = notes;
    if (createdBy !== undefined) updateData.createdBy = createdBy;

    const updated = await Expense.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE an expense by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Expense.findByIdAndDelete(id);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

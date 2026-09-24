import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  shopId: { type: String, required: true },
  title: { type: String, required: true },
  category: { 
    type: String, 
    default: 'Other' 
  },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['CASH', 'BANK', 'ONLINE', 'Paid'], default: 'CASH' },
  paymentSource: { type: String, enum: ['CASH', 'BANK', 'ONLINE'], default: 'CASH' },
  expenseDate: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  createdBy: { type: String, default: 'Shop Admin' }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);

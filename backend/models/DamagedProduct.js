import mongoose from 'mongoose';

const damagedProductSchema = new mongoose.Schema({
  shopId: { type: String, required: true },
  productName: { type: String, required: true },
  productId: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  petiQuantity: { type: Number, default: 0 },
  trayQuantity: { type: Number, default: 0 },
  eggQuantity: { type: Number, default: 0 },
  unitType: { type: String, default: 'single' },
  deductedEggs: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true, default: 0 },
  totalLoss: { type: Number, required: true, default: 0 },
  reason: { 
    type: String, 
    default: 'Defective Stock' 
  },
  damageDate: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  reportedBy: { type: String, default: 'Shop Admin' }
}, { timestamps: true });

export default mongoose.model('DamagedProduct', damagedProductSchema);

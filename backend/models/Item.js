import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  minStock: {
    type: Number,
    required: true,
    default: 0,
  },
  price: { 
    type: Number, 
    required: true 
  },
  costPrice: { 
    type: Number, 
    default: 0 
  },
  pricePerPeti: {
    type: Number,
    default: 0
  },
  pricePerTray: {
    type: Number,
    default: 0
  },
  pricePerEgg: {
    type: Number,
    default: 0
  },
  images: { 
    type: [String], 
    default: [] 
  },
  description: { 
    type: String, 
    default: '' 
  },
  mfgDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  // Units & Packaging Ratios
  unitType: {
    type: String,
    default: 'box'
  },
  traysPerPeti: {
    type: Number,
    default: 12
  },
  eggsPerTray: {
    type: Number,
    default: 30
  },
  petiQuantity: {
    type: Number,
    default: 0
  },
  trayQuantity: {
    type: Number,
    default: 0
  },
  eggQuantity: {
    type: Number,
    default: 0
  },
  // Supplier & Purchase Payment Details
  supplierName: {
    type: String,
    default: ''
  },
  supplierPhone: {
    type: String,
    default: ''
  },
  supplierLocation: {
    type: String,
    default: ''
  },
  totalPurchaseCost: {
    type: Number,
    default: 0
  },
  amountPaidToSupplier: {
    type: Number,
    default: 0
  },
  cashPaidToSupplier: {
    type: Number,
    default: 0
  },
  bankPaidToSupplier: {
    type: Number,
    default: 0
  },
  dueAmountToSupplier: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    default: 'Cash'
  },
  paymentReceipt: {
    type: String,
    default: ''
  },
  isOnlinePayment: {
    type: Boolean,
    default: false
  },
  lastUpdated: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0]
  }
}, { timestamps: true });

export default mongoose.model('Item', itemSchema);

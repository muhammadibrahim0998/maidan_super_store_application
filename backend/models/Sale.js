import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    name: String,
    quantity: Number,
    price: Number,
    costPrice: { type: Number, default: 0 },
    subtotal: Number,
    profit: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  serialNumber: {
    type: Number,
    default: 0
  },
  invoiceNumber: {
    type: String,
    default: ''
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled', 'returned'],
    default: 'completed'
  },
  returnReason: {
    type: String,
    default: ''
  },
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cashierName: String,
  customerName: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'BANK', 'ONLINE', 'EASYPAISA', 'CREDIT', 'DUE', 'SPLIT', 'PARTIAL'],
    default: 'CASH'
  },
  cashPaid: {
    type: Number,
    default: 0
  },
  bankPaid: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    default: 0
  },
  paymentReceipt: {
    type: String,
    default: ''
  },
  paymentProof: {
    type: String,
    default: ''
  },
  transactionId: {
    type: String,
    default: ''
  },
  isCredit: {
    type: Boolean,
    default: false
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerEmail: {
    type: String,
    default: ''
  },
  isOnlineOrder: {
    type: Boolean,
    default: false
  },
  orderSource: {
    type: String,
    default: 'WALK_IN_POS'
  },
  approvalStatus: {
    type: String,
    enum: ['APPROVED', 'PENDING_APPROVAL', 'REJECTED'],
    default: 'APPROVED'
  }
}, { timestamps: true });

export default mongoose.model('Sale', SaleSchema);

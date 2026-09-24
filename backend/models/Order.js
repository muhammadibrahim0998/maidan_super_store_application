import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  totalAmount: { type: Number, required: true },
  
  shippingDetails: {
    fullName: String,
    phone: String,
    address: String,
    city: String
  },

  paymentMethod: {
    type: String,
    enum: ['COD', 'STRIPE', 'EASYPAISA'],
    required: true
  },
  
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED'],
    default: 'PENDING'
  },
  
  orderStatus: {
    type: String,
    enum: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PROCESSING'
  },
  
  transactionId: { type: String }, // For Stripe/EasyPaisa reference
  paymentProof: { type: String }, // Screenshot image URL of EasyPaisa payment proof

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);

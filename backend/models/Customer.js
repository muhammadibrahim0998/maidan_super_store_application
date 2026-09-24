import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const CustomerSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  cart: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name: String,
    unit: { type: String, default: 'egg' },
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 }
  }]
}, { timestamps: true });

CustomerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

CustomerSchema.methods.comparePassword = async function(candidate) {
  return await bcrypt.compare(candidate, this.password);
};

const Customer = mongoose.model('Customer', CustomerSchema);
export default Customer;

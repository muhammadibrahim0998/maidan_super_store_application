import mongoose from "mongoose";

const ShopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  contactNumber: { type: String },
  logoUrl: { type: String },
  ownerDetails: {
    fullName: { type: String },
    email: { type: String, lowercase: true },
    phone: { type: String }
  }
}, { timestamps: true });

const Shop = mongoose.model('Shop', ShopSchema);
export default Shop;

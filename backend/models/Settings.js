import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  shopName: { type: String, default: 'Egg Station POS' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  currency: { type: String, default: '$' },
  logoUrl: { type: String, default: '' },
  ownerPassword: { type: String, default: 'admin123' },
  taxRate: { type: Number, default: 0 },
  ownerFullName: { type: String, default: '' },
  ownerEmail: { type: String, default: '' },
  ownerPhone: { type: String, default: '' },
  easypaisaNumber: { type: String, default: '' },
  easypaisaEnabled: { type: Boolean, default: false },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, unique: true }
}, { timestamps: true });

const Settings = mongoose.model('Settings', SettingsSchema);
export default Settings;

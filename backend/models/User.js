import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'cashier', 'salesman', 'shop_admin', 'super_admin'], default: 'cashier' },
  shopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shop',
    required: function() {
      return this.role !== 'super_admin';
    }
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  preferredShift: { type: String, enum: ['day', 'night', 'both'], default: 'both' },
  phoneNumber: { type: String },
  email: { type: String, sparse: true },
  lastLogged: { type: Date }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);
export default User;

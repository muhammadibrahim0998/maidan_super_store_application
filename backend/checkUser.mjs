import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: String, email: String, fullName: String,
  role: String, shopId: mongoose.Schema.Types.ObjectId,
  password: String, status: String
});
UserSchema.methods.comparePassword = async function(p) {
  return await bcrypt.compare(p, this.password);
};

const CustomerSchema = new mongoose.Schema({
  email: String, fullName: String,
  shopId: mongoose.Schema.Types.ObjectId, password: String
});
CustomerSchema.methods.comparePassword = async function(p) {
  return await bcrypt.compare(p, this.password);
};

await mongoose.connect('mongodb://127.0.0.1:27017/PerFume_Shop_Center_hayaseri');

const User = mongoose.model('User', UserSchema);
const Customer = mongoose.model('Customer', CustomerSchema);

const email = 'hayaserishopadmin@gmail.com';
const password = '123456';

// Check Users
const users = await User.find({ $or: [{ email }, { username: email }] });
console.log('=== USERS ===', users.length);
for (const u of users) {
  const match = u.password ? await u.comparePassword(password) : false;
  console.log({ username: u.username, email: u.email, role: u.role, shopId: u.shopId, passwordMatch: match });
}

// Check Customers
const customers = await Customer.find({ email });
console.log('=== CUSTOMERS ===', customers.length);
for (const c of customers) {
  const match = c.password ? await c.comparePassword(password) : false;
  console.log({ email: c.email, shopId: c.shopId, passwordMatch: match });
}

// Also list all shops
const Shop = mongoose.model('Shop', new mongoose.Schema({ name: String, slug: String }));
const shops = await Shop.find({});
console.log('=== SHOPS ===', shops.map(s => ({ id: s._id, name: s.name, slug: s.slug })));

await mongoose.disconnect();

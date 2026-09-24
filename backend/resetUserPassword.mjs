import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

await mongoose.connect('mongodb://127.0.0.1:27017/PerFume_Shop_Center_hayaseri');

const UserSchema = new mongoose.Schema({
  username: String, email: String, fullName: String,
  role: String, shopId: mongoose.Schema.Types.ObjectId,
  password: String, status: String
});

const User = mongoose.model('User', UserSchema);

const email = 'hayaserishopadmin@gmail.com';
const newPassword = '123456';

// Hash the new password
const hashed = await bcrypt.hash(newPassword, 10);

const result = await User.updateOne(
  { $or: [{ email }, { username: email }] },
  { $set: { password: hashed } }
);

console.log('Update result:', result);

// Verify it works now
const user = await User.findOne({ username: email });
const match = await bcrypt.compare(newPassword, user.password);
console.log('Password now matches 123456:', match);
console.log('Shop ID:', user.shopId);

await mongoose.disconnect();
console.log('Done!');

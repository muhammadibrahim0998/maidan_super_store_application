import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import User from './models/User.js';

dotenv.config();

const updateAttockUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database');

    const attockShop = await Shop.findOne({ name: { $regex: 'attock', $options: 'i' } });
    if (!attockShop) {
      console.log('❌ Attock shop not found');
      process.exit(1);
    }

    const emails = ['attock@gmail.com', 'attockshopadmin@gamil.com', 'attockshopadmin@gmail.com'];
    for (const email of emails) {
      let u = await User.findOne({ email });
      if (!u) {
        u = new User({
          username: email,
          email: email,
          password: 'admin123',
          fullName: 'Attock Shop Admin',
          role: 'shop_admin',
          shopId: attockShop._id,
          status: 'active'
        });
      } else {
        u.password = 'admin123';
        u.status = 'active';
        u.shopId = attockShop._id;
        u.role = 'shop_admin';
      }
      await u.save();
      console.log(`✅ Attock admin user ready: ${email} / admin123`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

updateAttockUsers();

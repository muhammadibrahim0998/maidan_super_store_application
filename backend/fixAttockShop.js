import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import User from './models/User.js';

dotenv.config();

const fixAttockShopAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database');

    console.log('\n--- Current Shops ---');
    const shops = await Shop.find({});
    shops.forEach(s => console.log(`• ID: ${s._id} | Name: ${s.name} | Status: ${s.status}`));

    let attockShop = shops.find(s => s.name.toLowerCase().includes('attock'));
    if (!attockShop) {
      attockShop = await Shop.create({
        name: 'Attock Branch',
        address: 'Attock, Pakistan',
        status: 'active',
        contactNumber: '03489273035'
      });
      console.log(`\n✅ Created Attock Branch Shop: ${attockShop._id}`);
    } else {
      attockShop.status = 'active';
      await attockShop.save();
      console.log(`\n✅ Attock Branch Shop active: ${attockShop._id}`);
    }

    console.log('\n--- Current Users ---');
    const users = await User.find({});
    users.forEach(u => console.log(`• ID: ${u._id} | Username: ${u.username} | Role: ${u.role} | ShopId: ${u.shopId}`));

    // Find or Create Shop Admin for Attock Branch
    let attockAdmin = await User.findOne({ username: 'attock@gmail.com' }) || await User.findOne({ shopId: attockShop._id, role: 'shop_admin' });

    if (!attockAdmin) {
      attockAdmin = new User({
        username: 'attock@gmail.com',
        email: 'attock@gmail.com',
        password: 'admin123',
        fullName: 'Attock Shop Admin',
        role: 'shop_admin',
        shopId: attockShop._id,
        status: 'active'
      });
      await attockAdmin.save();
      console.log(`\n✅ Created Attock Shop Admin User: attock@gmail.com / admin123`);
    } else {
      attockAdmin.username = 'attock@gmail.com';
      attockAdmin.email = 'attock@gmail.com';
      attockAdmin.password = 'admin123';
      attockAdmin.status = 'active';
      attockAdmin.shopId = attockShop._id;
      attockAdmin.role = 'shop_admin';
      await attockAdmin.save();
      console.log(`\n✅ Updated Attock Shop Admin User: attock@gmail.com / admin123`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing Attock shop admin:', error.message);
    process.exit(1);
  }
};

fixAttockShopAdmin();

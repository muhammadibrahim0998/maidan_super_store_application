import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import User from './models/User.js';

dotenv.config();

const updateShopAdminPassword = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/PerFume_Shop_Center_hayaseri';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    let shop = await Shop.findById('6aa2f845feefe8deb0fe2aa0');
    if (!shop) {
      shop = await Shop.findOne({});
    }

    let adminUser = await User.findOne({
      $or: [
        { email: 'hayaserishopadmin@gmail.com' },
        { username: 'hayaserishopadmin@gmail.com' },
        { shopId: shop?._id, role: 'shop_admin' }
      ]
    });

    if (!adminUser) {
      adminUser = new User({
        username: 'hayaserishopadmin@gmail.com',
        email: 'hayaserishopadmin@gmail.com',
        fullName: 'Sohil Khan',
        role: 'shop_admin',
        shopId: shop?._id,
        phoneNumber: '03488080344',
        status: 'active',
        password: 'super12345'
      });
    } else {
      adminUser.username = 'hayaserishopadmin@gmail.com';
      adminUser.email = 'hayaserishopadmin@gmail.com';
      adminUser.password = 'super12345';
      adminUser.status = 'active';
      if (shop) adminUser.shopId = shop._id;
    }

    await adminUser.save();
    console.log('✅ Password successfully updated to "super12345" for shop_admin!');

    console.log('\n--- Verified Details ---');
    console.log('User ID:', adminUser._id);
    console.log('Email / Username:', adminUser.email);
    console.log('Password:', 'super12345');
    console.log('Role:', adminUser.role);
    console.log('Shop ID:', adminUser.shopId);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating password:', error);
    process.exit(1);
  }
};

updateShopAdminPassword();

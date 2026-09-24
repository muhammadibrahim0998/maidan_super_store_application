import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import User from './models/User.js';
import Settings from './models/Settings.js';

dotenv.config();

const syncAllDetails = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/PerFume_Shop_Center_hayaseri';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    // 1. Ensure Shop Details
    let shop = await Shop.findById('6aa2f845feefe8deb0fe2aa0');
    if (!shop) {
      shop = await Shop.findOne({});
    }

    if (!shop) {
      shop = new Shop({
        _id: new mongoose.Types.ObjectId('6aa2f845feefe8deb0fe2aa0'),
        name: 'Hyasire Genral Store',
        address: 'Dir lower, Kpk, Pakistan',
        status: 'active',
        contactNumber: '03488080344',
        ownerDetails: {
          fullName: 'Sohil Khan',
          email: 'hayaserishopadmin@gmail.com',
          phone: '03488080344'
        }
      });
    } else {
      shop.name = 'Hyasire Genral Store';
      shop.address = 'Dir lower, Kpk, Pakistan';
      shop.status = 'active';
      shop.contactNumber = '03488080344';
      shop.ownerDetails = {
        fullName: 'Sohil Khan',
        email: 'hayaserishopadmin@gmail.com',
        phone: '03488080344'
      };
    }
    await shop.save();
    console.log('✅ Shop details saved completely in "shops" collection.');

    // 2. Ensure Super Admin User
    let superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      superAdmin = await User.findOne({ email: 'sohail1592000@gmail.com' });
    }

    if (!superAdmin) {
      superAdmin = new User({
        username: 'sohail1592000@gmail.com',
        email: 'sohail1592000@gmail.com',
        password: 'super12345',
        fullName: 'System Super Admin',
        role: 'super_admin',
        phoneNumber: '03488080344',
        status: 'active',
        preferredShift: 'both'
      });
    } else {
      superAdmin.username = 'sohail1592000@gmail.com';
      superAdmin.email = 'sohail1592000@gmail.com';
      superAdmin.password = 'super12345';
      superAdmin.fullName = 'System Super Admin';
      superAdmin.role = 'super_admin';
      superAdmin.phoneNumber = '03488080344';
      superAdmin.status = 'active';
      superAdmin.preferredShift = 'both';
    }
    await superAdmin.save();
    console.log('✅ Super Admin saved completely in "users" collection.');

    // 3. Ensure Shop Admin User
    let shopAdmin = await User.findOne({
      $or: [
        { email: 'hayaserishopadmin@gmail.com' },
        { username: 'hayaserishopadmin@gmail.com' },
        { shopId: shop._id, role: 'shop_admin' }
      ]
    });

    if (!shopAdmin) {
      shopAdmin = new User({
        username: 'hayaserishopadmin@gmail.com',
        email: 'hayaserishopadmin@gmail.com',
        password: 'super12345',
        fullName: 'Sohil Khan',
        role: 'shop_admin',
        shopId: shop._id,
        phoneNumber: '03488080344',
        status: 'active',
        preferredShift: 'both'
      });
    } else {
      shopAdmin.username = 'hayaserishopadmin@gmail.com';
      shopAdmin.email = 'hayaserishopadmin@gmail.com';
      shopAdmin.password = 'super12345';
      shopAdmin.fullName = 'Sohil Khan';
      shopAdmin.role = 'shop_admin';
      shopAdmin.shopId = shop._id;
      shopAdmin.phoneNumber = '03488080344';
      shopAdmin.status = 'active';
      shopAdmin.preferredShift = 'both';
    }
    await shopAdmin.save();
    console.log('✅ Shop Admin saved completely in "users" collection.');

    // 4. Ensure Settings Document for Shop
    let settings = await Settings.findOne({ shopId: shop._id });
    if (!settings) {
      settings = new Settings({
        shopId: shop._id,
        shopName: 'Hyasire Genral Store',
        address: 'Dir lower, Kpk, Pakistan',
        phone: '03488080344',
        email: 'hayaserishopadmin@gmail.com',
        ownerFullName: 'Sohil Khan',
        ownerEmail: 'hayaserishopadmin@gmail.com',
        ownerPhone: '03488080344',
        ownerPassword: 'super12345',
        easypaisaNumber: '03488080344',
        easypaisaEnabled: true
      });
    } else {
      settings.shopName = 'Hyasire Genral Store';
      settings.address = 'Dir lower, Kpk, Pakistan';
      settings.phone = '03488080344';
      settings.email = 'hayaserishopadmin@gmail.com';
      settings.ownerFullName = 'Sohil Khan';
      settings.ownerEmail = 'hayaserishopadmin@gmail.com';
      settings.ownerPhone = '03488080344';
      settings.ownerPassword = 'super12345';
    }
    await settings.save();
    console.log('✅ Shop Settings saved completely in "settings" collection.');

    // Fetch and display complete data
    const allUsers = await User.find({}).lean();
    const allShops = await Shop.find({}).lean();
    const allSettings = await Settings.find({}).lean();

    console.log('\n================ DATABASE SUMMARY ================');
    console.log('\n--- 1. SHOPS COLLECTION ---');
    console.log(JSON.stringify(allShops, null, 2));

    console.log('\n--- 2. USERS COLLECTION ---');
    console.log(JSON.stringify(allUsers.map(u => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      shopId: u.shopId,
      status: u.status,
      phoneNumber: u.phoneNumber
    })), null, 2));

    console.log('\n--- 3. SETTINGS COLLECTION ---');
    console.log(JSON.stringify(allSettings, null, 2));
    console.log('==================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

syncAllDetails();

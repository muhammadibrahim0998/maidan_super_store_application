import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import Settings from './models/Settings.js';

dotenv.config();

const updateShopNames = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database');

    // Update shops
    const shops = await Shop.find({});
    for (const shop of shops) {
      if (shop.name.toLowerCase().includes('hayaseri') || shop.name.toLowerCase().includes('attock')) {
        shop.name = 'Attock Shop';
        await shop.save();
        console.log(`✅ Updated Shop (${shop._id}) name to: Attock Shop`);
      }
    }

    // Update settings
    const settingsList = await Settings.find({});
    for (const s of settingsList) {
      if (s.shopName && (s.shopName.toLowerCase().includes('hayaseri') || s.shopName.toLowerCase().includes('attock'))) {
        s.shopName = 'Attock Shop';
        await s.save();
        console.log(`✅ Updated Settings (${s._id}) shopName to: Attock Shop`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating shop names:', error.message);
    process.exit(1);
  }
};

updateShopNames();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import Settings from './models/Settings.js';
import Item from './models/Item.js';

dotenv.config();

const inspectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database\n');

    console.log('--- SHOPS ---');
    const shops = await Shop.find({});
    shops.forEach(s => console.log(`• ID: ${s._id} | Name: "${s.name}" | Status: ${s.status}`));

    console.log('\n--- SETTINGS ---');
    const settings = await Settings.find({});
    settings.forEach(st => console.log(`• ID: ${st._id} | ShopId: ${st.shopId} | ShopName: "${st.shopName}"`));

    console.log('\n--- ITEMS COUNT PER SHOP ---');
    for (const shop of shops) {
      const count = await Item.countDocuments({ shopId: shop._id });
      console.log(`• Shop "${shop.name}" (${shop._id}): ${count} items`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

inspectDB();

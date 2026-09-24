import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import Settings from './models/Settings.js';

dotenv.config();

const fixPeshawarShop = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database\n');

    // 1. Update Shop 6a741138253a8863f58ae4a4 to "Peshawar Shop"
    const peshawarShop = await Shop.findById('6a741138253a8863f58ae4a4');
    if (peshawarShop) {
      peshawarShop.name = 'Peshawar Shop';
      peshawarShop.address = 'Peshawar, Pakistan';
      await peshawarShop.save();
      console.log(`✅ Updated Shop 6a741138253a8863f58ae4a4 -> Name: "Peshawar Shop" | Address: "Peshawar, Pakistan"`);
    }

    // 2. Update Settings for 6a741138253a8863f58ae4a4
    const peshawarSettings = await Settings.findOne({ shopId: '6a741138253a8863f58ae4a4' });
    if (peshawarSettings) {
      peshawarSettings.shopName = 'Peshawar Shop';
      peshawarSettings.address = 'Peshawar, Pakistan';
      await peshawarSettings.save();
      console.log(`✅ Updated Settings 6a741138253a8863f58ae4a4 -> shopName: "Peshawar Shop"`);
    }

    // Print all active shops
    console.log('\n--- ALL SHOPS IN DB ---');
    const shops = await Shop.find({});
    shops.forEach(s => console.log(`• ID: ${s._id} | Name: "${s.name}" | Address: "${s.address}"`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

fixPeshawarShop();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import Settings from './models/Settings.js';
import Item from './models/Item.js';

dotenv.config();

const ATTOCK_CATEGORIES = [
  { name: 'loman brown',       price: 25, stock: 500 },
  { name: 'loman brown egge',  price: 26, stock: 500 },
  { name: 'loman black',       price: 28, stock: 400 },
  { name: 'china eggs',        price: 20, stock: 600 },
  { name: 'pak egg',           price: 22, stock: 600 },
  { name: 'Super Jumbo',       price: 30, stock: 500 },
  { name: 'Jumbo',             price: 28, stock: 500 },
  { name: 'Stander',           price: 25, stock: 500 },
  { name: 'Weak Shell',        price: 18, stock: 300 },
  { name: 'Dusty',             price: 16, stock: 300 },
  { name: 'Floor',             price: 15, stock: 200 },
  { name: 'Step Stander',      price: 22, stock: 400 },
  { name: 'Step Jumbo',        price: 24, stock: 400 },
  { name: 'Sandy',             price: 15, stock: 200 },
  { name: 'Starter',           price: 20, stock: 400 },
  { name: 'Double White',      price: 32, stock: 200 },
  { name: 'Double Brown',      price: 35, stock: 200 },
  { name: 'Golden',            price: 40, stock: 150 },
  { name: 'Breeder',           price: 45, stock: 150 },
  { name: 'Special',           price: 50, stock: 150 }
];

const syncAttockShop = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database\n');

    // 1. Update all active Shops to "Attock Shop"
    const shops = await Shop.find({});
    for (const shop of shops) {
      shop.name = 'Attock Shop';
      shop.address = 'Attock, Pakistan';
      shop.contactNumber = '03489273035';
      shop.status = 'active';
      await shop.save();
      console.log(`✅ Updated Shop (${shop._id}) -> Name: "Attock Shop" | Address: "Attock, Pakistan"`);

      // Update or create Settings for this shop
      let settings = await Settings.findOne({ shopId: shop._id });
      if (!settings) {
        settings = new Settings({ shopId: shop._id });
      }
      settings.shopName = 'Attock Shop';
      settings.address = 'Attock, Pakistan';
      settings.phone = '03489273035';
      settings.currency = 'Rs.';
      await settings.save();
      console.log(`  └─ Updated Settings for Shop (${shop._id}) -> shopName: "Attock Shop"`);

      // Populate/Sync all 20 Attock egg categories for this shop
      for (const cat of ATTOCK_CATEGORIES) {
        let item = await Item.findOne({ shopId: shop._id, name: cat.name });
        if (!item) {
          item = new Item({
            shopId: shop._id,
            name: cat.name,
            category: cat.name,
            price: cat.price,
            costPrice: Math.round(cat.price * 0.75),
            stock: cat.stock,
            minStock: 20,
            images: ['/egg2.png'],
            description: `Fresh egg product - ${cat.name}`
          });
        } else {
          item.category = cat.name;
          item.images = ['/egg2.png'];
          item.price = cat.price;
          item.stock = cat.stock;
        }
        await item.save();
      }
      console.log(`  └─ Synced 20 Attock Egg Items for Shop (${shop._id})\n`);
    }

    console.log('🎉 All Shops in DB are now updated to "Attock Shop" with 20 Attock Egg Products!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error syncing Attock shop:', err.message);
    process.exit(1);
  }
};

syncAttockShop();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
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

const seedAttockShopItems = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database');

    const attockShop = await Shop.findOne({ name: { $regex: 'attock', $options: 'i' } });
    if (!attockShop) {
      console.log('❌ Attock shop not found');
      process.exit(1);
    }

    console.log(`✅ Found Attock Shop: ${attockShop.name} (${attockShop._id})`);

    let added = 0;
    let updated = 0;

    for (const cat of ATTOCK_CATEGORIES) {
      let item = await Item.findOne({ shopId: attockShop._id, name: cat.name });
      if (!item) {
        item = new Item({
          shopId: attockShop._id,
          name: cat.name,
          category: cat.name,
          price: cat.price,
          costPrice: Math.round(cat.price * 0.75),
          stock: cat.stock,
          minStock: 20,
          images: ['/egg2.png'],
          description: `Fresh egg product - ${cat.name}`
        });
        await item.save();
        added++;
        console.log(`➕ Added for Attock: ${cat.name}`);
      } else {
        item.category = cat.name;
        item.images = ['/egg2.png'];
        item.price = cat.price;
        item.stock = cat.stock;
        await item.save();
        updated++;
        console.log(`🔄 Updated for Attock: ${cat.name}`);
      }
    }

    console.log(`\n🥚 Attock Seeding Completed! Added: ${added} | Updated: ${updated}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Attock categories:', error.message);
    process.exit(1);
  }
};

seedAttockShopItems();

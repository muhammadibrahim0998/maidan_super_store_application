import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import Item from './models/Item.js';

dotenv.config();

const EGG_CATEGORIES = [
  { name: 'Super Jumbo',   weight: '79gm',  price: 25, stock: 500 },
  { name: 'Jumbo',         weight: '65gm',  price: 22, stock: 500 },
  { name: 'Stander',       weight: '60gm',  price: 20, stock: 500 },
  { name: 'Weak Shell',    weight: '',      price: 15, stock: 300 },
  { name: 'Dusty',         weight: '',      price: 14, stock: 300 },
  { name: 'Floor',         weight: '',      price: 13, stock: 200 },
  { name: 'Step Stander',  weight: '',      price: 18, stock: 400 },
  { name: 'Step Jumbo',    weight: '',      price: 20, stock: 400 },
  { name: 'Sandy',         weight: '',      price: 12, stock: 200 },
  { name: 'Starter',       weight: '48gm',  price: 16, stock: 400 },
  { name: 'Double White',  weight: '',      price: 28, stock: 150 },
  { name: 'Double Brown',  weight: '',      price: 30, stock: 150 },
  { name: 'A Grade',       weight: '',      price: 22, stock: 500 },
  { name: 'Golden',        weight: '',      price: 35, stock: 100 },
  { name: 'Breeder',       weight: '',      price: 40, stock: 100 },
  { name: 'Special',       weight: '',      price: 45, stock: 100 },
];

const seedEggCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database');

    // Find the first active shop
    let shop = await Shop.findOne({ status: 'active' });
    if (!shop) {
      // Create a default shop if none exists
      shop = await Shop.create({
        name: 'Maidan Perfume Shop',
        address: 'Pakistan',
        status: 'active',
        contactNumber: '03489273035'
      });
      console.log('✅ Created default shop:', shop.name);
    } else {
      console.log('✅ Using existing shop:', shop.name);
    }

    const shopId = shop._id;
    let added = 0;
    let skipped = 0;

    for (const egg of EGG_CATEGORIES) {
      const itemName = egg.weight ? `${egg.name} ${egg.weight}` : egg.name;
      const exists = await Item.findOne({ shopId, name: itemName });

      if (exists) {
        console.log(`⏩ Skipped (already exists): ${itemName}`);
        skipped++;
        continue;
      }

      await Item.create({
        shopId,
        name: itemName,
        category: egg.name,   // category = egg type name
        price: egg.price,
        costPrice: Math.round(egg.price * 0.75),
        stock: egg.stock,
        minStock: 50,
        description: egg.weight ? `Fresh eggs - ${egg.name}, Weight: ${egg.weight}` : `Fresh eggs - ${egg.name}`,
      });

      console.log(`✅ Added: ${itemName}`);
      added++;
    }

    console.log(`\n🥚 Done! Added: ${added} | Skipped: ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedEggCategories();

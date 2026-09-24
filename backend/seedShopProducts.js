import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import Item from './models/Item.js';

dotenv.config();

const defaultPerfumeProducts = [
  { name: 'Oud Al Layl 100ml', category: 'Perfumes', price: 2500, costPrice: 1800, stock: 100, minStock: 10, unitType: 'bottle', images: [] },
  { name: 'Amber Oud Gold Edition', category: 'Perfumes', price: 4200, costPrice: 3200, stock: 80, minStock: 8, unitType: 'bottle', images: [] },
  { name: 'Dirham Gold 100ml', category: 'Perfumes', price: 1800, costPrice: 1300, stock: 120, minStock: 15, unitType: 'bottle', images: [] },
  { name: 'Khamrah Lattafa 100ml', category: 'Perfumes', price: 5500, costPrice: 4200, stock: 60, minStock: 6, unitType: 'bottle', images: [] },
  { name: 'Musk Al Tahara 12ml (Attar)', category: 'Attar / Ittar', price: 650, costPrice: 400, stock: 200, minStock: 25, unitType: 'bottle', images: [] },
  { name: 'Shamama Tul Amber Attar 6ml', category: 'Attar / Ittar', price: 850, costPrice: 550, stock: 150, minStock: 20, unitType: 'bottle', images: [] },
  { name: 'Rose & Vanilla Body Mist', category: 'Body Spray', price: 1200, costPrice: 850, stock: 90, minStock: 10, unitType: 'bottle', images: [] },
  { name: 'Royal Bakhoor Incense 50g', category: 'Oud & Bakhoor', price: 1600, costPrice: 1100, stock: 75, minStock: 10, unitType: 'box', images: [] },
  { name: 'Luxury Perfume Gift Set', category: 'Gift Sets', price: 7500, costPrice: 5500, stock: 40, minStock: 5, unitType: 'box', images: [] },
  { name: 'White Oud Concentrated Oil', category: 'Essential Oils', price: 1100, costPrice: 750, stock: 110, minStock: 15, unitType: 'bottle', images: [] }
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/PerFume_Shop_Center_hayaseri');
    console.log('Connected to DB');

    const shops = await Shop.find({});
    for (const shop of shops) {
      const existingCount = await Item.countDocuments({ shopId: shop._id });
      console.log(`Shop: "${shop.name}" (ID: ${shop._id}) has ${existingCount} items.`);
      if (existingCount < 5) {
        console.log(`Seeding default catalog products for "${shop.name}"...`);
        const itemsToInsert = defaultPerfumeProducts.map(p => ({
          ...p,
          shopId: shop._id
        }));
        await Item.insertMany(itemsToInsert);
        console.log(`✅ Seeded ${itemsToInsert.length} products for "${shop.name}"!`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

seedProducts();

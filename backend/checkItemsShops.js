import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import Item from './models/Item.js';
import User from './models/User.js';

dotenv.config();

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('Connected to DB');

    const shops = await Shop.find({});
    console.log('\n--- ALL SHOPS ---');
    shops.forEach(s => console.log(`Shop ID: ${s._id} | Name: "${s.name}"`));

    const users = await User.find({});
    console.log('\n--- ALL USERS ---');
    users.forEach(u => console.log(`User: ${u.username} | Role: ${u.role} | shopId: ${u.shopId}`));

    const items = await Item.find({});
    console.log(`\n--- TOTAL ITEMS IN DB: ${items.length} ---`);
    items.forEach(i => console.log(`Item: "${i.name}" | price: ${i.price} | stock: ${i.stock} | shopId: ${i.shopId}`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkData();

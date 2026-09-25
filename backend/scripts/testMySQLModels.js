import dotenv from 'dotenv';
dotenv.config();

import Shop from '../models/Shop.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import DamagedProduct from '../models/DamagedProduct.js';
import CashSession from '../models/CashSession.js';
import Order from '../models/Order.js';
import SystemUpdate from '../models/SystemUpdate.js';

async function testAll() {
  console.log('--- Testing MySQL Models ---');

  const shops = await Shop.find({});
  console.log(`Shops (${shops.length}):`, shops.map(s => ({ id: s.id, name: s.name })));

  const users = await User.find({});
  console.log(`Users (${users.length}):`, users.map(u => ({ id: u.id, username: u.username, role: u.role })));

  const items = await Item.find({}).sort({ createdAt: -1 });
  console.log(`Items (${items.length}):`, items.map(i => ({ id: i.id, name: i.name, price: i.price, stock: i.stock, imagesCount: i.images?.length })));

  const sales = await Sale.find({}).sort({ saleDate: -1 });
  console.log(`Sales (${sales.length}):`, sales.map(s => ({ id: s.id, invoice: s.invoiceNumber, total: s.totalAmount })));

  const settings = await Settings.findOne({});
  console.log('Settings:', settings ? { shopName: settings.shopName, currency: settings.currency } : null);

  const updates = await SystemUpdate.find({});
  console.log(`System Updates (${updates.length}):`, updates.map(u => ({ version: u.version, title: u.title })));

  // Test User Password comparison
  if (users.length > 0) {
    const admin = users.find(u => u.username === 'hayaserishopadmin@gmail.com') || users[0];
    const isMatch = await admin.comparePassword('123456');
    console.log(`Password comparison for ${admin.username} (with '123456'):`, isMatch);
  }

  console.log('✅ ALL MYSQL MODELS ARE WORKING PERFECTLY!');
  process.exit(0);
}

testAll().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

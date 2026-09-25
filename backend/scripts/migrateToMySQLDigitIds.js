import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { pool } from '../config/mysql.js';
import { initMySQLTables } from '../config/initMySQL.js';

dotenv.config();

export async function migrateWithDigitIds() {
  console.log('🚀 Starting Full Migration from MongoDB to MySQL with Digit IDs (1, 2, 3...) in perfume_shop_center_hayaseri...');

  // 1. Connect MongoDB first to fetch all data
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/PerFume_Shop_Center_hayaseri';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);
  }

  const db = mongoose.connection.db;

  const mongoShops = await db.collection('shops').find({}).toArray();
  const mongoSettings = await db.collection('settings').find({}).toArray();
  const mongoUsers = await db.collection('users').find({}).toArray();
  const mongoCustomers = await db.collection('customers').find({}).toArray();
  const mongoItems = await db.collection('items').find({}).toArray();
  const mongoSales = await db.collection('sales').find({}).toArray();
  const mongoExpenses = await db.collection('expenses').find({}).toArray();
  const mongoDamaged = await db.collection('damagedproducts').find({}).toArray();
  const mongoSessions = await db.collection('cashsessions').find({}).toArray();
  const mongoOrders = await db.collection('orders').find({}).toArray();
  const mongoUpdates = await db.collection('systemupdates').find({}).toArray();

  console.log(`📦 MongoDB Data Found:
    Shops: ${mongoShops.length}
    Settings: ${mongoSettings.length}
    Users: ${mongoUsers.length}
    Customers: ${mongoCustomers.length}
    Items: ${mongoItems.length}
    Sales: ${mongoSales.length}
    Expenses: ${mongoExpenses.length}
    Damaged: ${mongoDamaged.length}
    Cash Sessions: ${mongoSessions.length}
    Orders: ${mongoOrders.length}
    System Updates: ${mongoUpdates.length}
  `);

  // 2. Drop & Recreate MySQL Tables with INT AUTO_INCREMENT PRIMARY KEY
  await initMySQLTables(true);

  // Maps from Mongo hex ObjectId string to digit ID (1, 2, 3...)
  const shopIdMap = new Map();
  const userIdMap = new Map();
  const customerIdMap = new Map();
  const itemIdMap = new Map();

  // 1. Migrate Shops
  let shopDigitId = 1;
  for (const s of mongoShops) {
    const mongoId = s._id.toString();
    const digitId = shopDigitId++;
    shopIdMap.set(mongoId, digitId);

    await pool.query(`
      INSERT INTO shops (id, name, address, status, contactNumber, logoUrl, ownerFullName, ownerEmail, ownerPhone, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      s.name || 'Hyasire Genral Store',
      s.address || '',
      s.status || 'active',
      s.contactNumber || '',
      s.logoUrl || '',
      s.ownerDetails?.fullName || s.ownerFullName || '',
      s.ownerDetails?.email || s.ownerEmail || '',
      s.ownerDetails?.phone || s.ownerPhone || '',
      s.createdAt || new Date(),
      s.updatedAt || new Date()
    ]);
  }
  if (mongoShops.length === 0) {
    // Insert default shop with ID 1
    await pool.query(`
      INSERT INTO shops (id, name, address, status, contactNumber, logoUrl, ownerFullName, ownerEmail, ownerPhone, createdAt, updatedAt)
      VALUES (1, 'Hyasire Genral Store', 'Hayaseri Maidan', 'active', '03000000000', '', 'Sohil Khan', 'hayaserishopadmin@gmail.com', '03000000000', NOW(), NOW())
    `);
  }
  const defaultShopId = 1;

  // 2. Migrate Settings
  let settingsDigitId = 1;
  for (const st of mongoSettings) {
    const digitId = settingsDigitId++;
    const sId = st.shopId ? (shopIdMap.get(st.shopId.toString()) || defaultShopId) : defaultShopId;

    await pool.query(`
      INSERT INTO settings (id, shopId, shopName, address, phone, email, currency, logoUrl, ownerPassword, taxRate, ownerFullName, ownerEmail, ownerPhone, easypaisaNumber, easypaisaEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      sId,
      st.shopName || 'Hyasire Genral Store',
      st.address || '',
      st.phone || '',
      st.email || '',
      st.currency || '$',
      st.logoUrl || '',
      st.ownerPassword || '123456',
      st.taxRate || 0,
      st.ownerFullName || '',
      st.ownerEmail || '',
      st.ownerPhone || '',
      st.easypaisaNumber || '',
      st.easypaisaEnabled ? 1 : 0,
      st.createdAt || new Date(),
      st.updatedAt || new Date()
    ]);
  }
  if (mongoSettings.length === 0) {
    await pool.query(`
      INSERT INTO settings (id, shopId, shopName, address, phone, email, currency, logoUrl, ownerPassword, taxRate, ownerFullName, ownerEmail, ownerPhone, easypaisaNumber, easypaisaEnabled, createdAt, updatedAt)
      VALUES (1, 1, 'Hyasire Genral Store', 'Hayaseri Maidan', '', '', '$', '', '123456', 0, 'Sohil Khan', 'hayaserishopadmin@gmail.com', '', '', 0, NOW(), NOW())
    `);
  }

  // 3. Migrate Users (Admin & Staff)
  let userDigitId = 1;
  for (const u of mongoUsers) {
    const mongoId = u._id.toString();
    const digitId = userDigitId++;
    userIdMap.set(mongoId, digitId);

    const sId = u.shopId ? (shopIdMap.get(u.shopId.toString()) || defaultShopId) : defaultShopId;

    await pool.query(`
      INSERT INTO users (id, username, password, fullName, role, shopId, status, preferredShift, phoneNumber, email, lastLogged, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      u.username,
      u.password,
      u.fullName || u.username,
      u.role || 'shop_admin',
      sId,
      u.status || 'active',
      u.preferredShift || 'both',
      u.phoneNumber || '',
      u.email || '',
      u.lastLogged || null,
      u.createdAt || new Date(),
      u.updatedAt || new Date()
    ]);
  }

  // 4. Migrate Customers
  let customerDigitId = 1;
  for (const c of mongoCustomers) {
    const mongoId = c._id.toString();
    const digitId = customerDigitId++;
    customerIdMap.set(mongoId, digitId);

    const sId = c.shopId ? (shopIdMap.get(c.shopId.toString()) || defaultShopId) : defaultShopId;

    await pool.query(`
      INSERT INTO customers (id, fullName, email, password, phone, address, shopId, cart, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      c.fullName,
      c.email,
      c.password,
      c.phone || '',
      c.address || '',
      sId,
      JSON.stringify(c.cart || []),
      c.createdAt || new Date(),
      c.updatedAt || new Date()
    ]);
  }

  // 5. Migrate Items / Products
  let itemDigitId = 1;
  for (const it of mongoItems) {
    const mongoId = it._id.toString();
    const digitId = itemDigitId++;
    itemIdMap.set(mongoId, digitId);

    const sId = it.shopId ? (shopIdMap.get(it.shopId.toString()) || defaultShopId) : defaultShopId;

    await pool.query(`
      INSERT INTO items (
        id, shopId, name, category, stock, minStock, price, costPrice, pricePerPeti, pricePerTray, pricePerEgg,
        unitType, petiQuantity, totalPurchaseCost, amountPaidToSupplier, dueAmountToSupplier, supplierName,
        supplierPhone, supplierAddress, supplierPetiPrice, supplierInvoiceNo, supplierInvoiceDate, paymentMethod,
        paymentReceipt, isOnlinePayment, isCompanyStock, images, description, mfgDate, expiryDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      sId,
      it.name,
      it.category || 'General Perfumes',
      it.stock || 0,
      it.minStock || 0,
      it.price || 0,
      it.costPrice || 0,
      it.pricePerPeti || 0,
      it.pricePerTray || 0,
      it.pricePerEgg || 0,
      it.unitType || 'egg',
      it.petiQuantity || 0,
      it.totalPurchaseCost || 0,
      it.amountPaidToSupplier || 0,
      it.dueAmountToSupplier || 0,
      it.supplierName || '',
      it.supplierPhone || '',
      it.supplierAddress || '',
      it.supplierPetiPrice || 0,
      it.supplierInvoiceNo || '',
      it.supplierInvoiceDate || null,
      it.paymentMethod || 'CASH',
      it.paymentReceipt || '',
      it.isOnlinePayment ? 1 : 0,
      it.isCompanyStock ? 1 : 0,
      JSON.stringify(it.images || []),
      it.description || '',
      it.mfgDate || null,
      it.expiryDate || null,
      it.createdAt || new Date(),
      it.updatedAt || new Date()
    ]);
  }

  // 6. Migrate Sales
  let saleDigitId = 1;
  for (const sl of mongoSales) {
    const digitId = saleDigitId++;
    const sId = sl.shopId ? (shopIdMap.get(sl.shopId.toString()) || defaultShopId) : defaultShopId;
    const cId = sl.customerId ? (customerIdMap.get(sl.customerId.toString()) || null) : null;
    const cashierId = sl.cashierId ? (userIdMap.get(sl.cashierId.toString()) || 2) : 2;

    const remappedItems = (sl.items || []).map(itm => {
      if (itm.productId && itemIdMap.has(itm.productId.toString())) {
        return { ...itm, productId: itemIdMap.get(itm.productId.toString()) };
      }
      return itm;
    });

    await pool.query(`
      INSERT INTO sales (
        id, shopId, totalAmount, totalProfit, serialNumber, invoiceNumber, saleDate, status,
        returnReason, cashierId, cashierName, customerName, customerPhone, paymentMethod,
        cashPaid, bankPaid, dueAmount, paymentReceipt, paymentProof, transactionId,
        isCredit, orderId, customerId, customerEmail, isOnlineOrder, orderSource, approvalStatus,
        items, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      sId,
      sl.totalAmount || 0,
      sl.totalProfit || 0,
      sl.serialNumber || 0,
      sl.invoiceNumber || '',
      sl.saleDate || new Date(),
      sl.status || 'completed',
      sl.returnReason || '',
      cashierId,
      sl.cashierName || '',
      sl.customerName || '',
      sl.customerPhone || '',
      sl.paymentMethod || 'CASH',
      sl.cashPaid || 0,
      sl.bankPaid || 0,
      sl.dueAmount || 0,
      sl.paymentReceipt || '',
      sl.paymentProof || '',
      sl.transactionId || '',
      sl.isCredit ? 1 : 0,
      null,
      cId,
      sl.customerEmail || '',
      sl.isOnlineOrder ? 1 : 0,
      sl.orderSource || 'WALK_IN_POS',
      sl.approvalStatus || 'APPROVED',
      JSON.stringify(remappedItems),
      sl.createdAt || new Date(),
      sl.updatedAt || new Date()
    ]);
  }

  // 7. Migrate Expenses
  let expDigitId = 1;
  for (const ex of mongoExpenses) {
    const digitId = expDigitId++;
    const sId = ex.shopId ? (shopIdMap.get(ex.shopId.toString()) || defaultShopId) : defaultShopId;
    await pool.query(`
      INSERT INTO expenses (id, shopId, title, category, amount, paymentMethod, paymentSource, expenseDate, notes, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      sId,
      ex.title,
      ex.category || 'Other',
      ex.amount || 0,
      ex.paymentMethod || 'CASH',
      ex.paymentSource || 'CASH',
      ex.expenseDate || new Date(),
      ex.notes || '',
      ex.createdBy || 'Shop Admin',
      ex.createdAt || new Date(),
      ex.updatedAt || new Date()
    ]);
  }

  // 8. Migrate Damaged Products
  let dpDigitId = 1;
  for (const dp of mongoDamaged) {
    const digitId = dpDigitId++;
    const sId = dp.shopId ? (shopIdMap.get(dp.shopId.toString()) || defaultShopId) : defaultShopId;
    const pId = dp.productId ? (itemIdMap.get(dp.productId.toString()) || null) : null;
    await pool.query(`
      INSERT INTO damaged_products (
        id, shopId, productName, productId, quantity, petiQuantity, trayQuantity, eggQuantity,
        unitType, deductedEggs, unitPrice, totalLoss, reason, damageDate, notes, reportedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      sId,
      dp.productName,
      pId,
      dp.quantity || 0,
      dp.petiQuantity || 0,
      dp.trayQuantity || 0,
      dp.eggQuantity || 0,
      dp.unitType || 'single',
      dp.deductedEggs || 0,
      dp.unitPrice || 0,
      dp.totalLoss || 0,
      dp.reason || 'Defective Stock',
      dp.damageDate || new Date(),
      dp.notes || '',
      dp.reportedBy || 'Shop Admin',
      dp.createdAt || new Date(),
      dp.updatedAt || new Date()
    ]);
  }

  // 9. Migrate Cash Sessions
  let csDigitId = 1;
  for (const cs of mongoSessions) {
    const digitId = csDigitId++;
    const sId = cs.shopId ? (shopIdMap.get(cs.shopId.toString()) || defaultShopId) : defaultShopId;
    const cId = cs.cashierId ? (userIdMap.get(cs.cashierId.toString()) || 2) : 2;
    await pool.query(`
      INSERT INTO cash_sessions (
        id, shopId, cashierId, startTime, endTime, openingCash, closingCash,
        totalSales, totalReturns, expectedCash, actualCash, cashDifference, status, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      sId,
      cId,
      cs.startTime || new Date(),
      cs.endTime || null,
      cs.openingCash || 0,
      cs.closingCash || 0,
      cs.totalSales || 0,
      cs.totalReturns || 0,
      cs.expectedCash || 0,
      cs.actualCash || 0,
      cs.cashDifference || 0,
      cs.status || 'active',
      cs.notes || '',
      cs.createdAt || new Date(),
      cs.updatedAt || new Date()
    ]);
  }

  // 10. Migrate Orders
  let ordDigitId = 1;
  for (const ord of mongoOrders) {
    const digitId = ordDigitId++;
    const sId = ord.shopId ? (shopIdMap.get(ord.shopId.toString()) || defaultShopId) : defaultShopId;
    const cId = ord.customerId ? (customerIdMap.get(ord.customerId.toString()) || null) : null;
    await pool.query(`
      INSERT INTO orders (
        id, shopId, customerId, items, totalAmount, shippingDetails,
        paymentMethod, paymentStatus, orderStatus, transactionId, paymentProof, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      sId,
      cId,
      JSON.stringify(ord.items || []),
      ord.totalAmount || 0,
      JSON.stringify(ord.shippingDetails || {}),
      ord.paymentMethod || 'COD',
      ord.paymentStatus || 'PENDING',
      ord.orderStatus || 'PROCESSING',
      ord.transactionId || '',
      ord.paymentProof || '',
      ord.createdAt || new Date(),
      ord.updatedAt || new Date()
    ]);
  }

  // 11. Migrate System Updates
  let upDigitId = 1;
  for (const up of mongoUpdates) {
    const digitId = upDigitId++;
    await pool.query(`
      INSERT INTO system_updates (id, version, title, description, releaseDate, isCritical, changes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      digitId,
      up.version || '1.0.0',
      up.title || '',
      up.description || '',
      up.releaseDate || new Date(),
      up.isCritical ? 1 : 0,
      JSON.stringify(up.changes || []),
      up.createdAt || new Date(),
      up.updatedAt || new Date()
    ]);
  }

  console.log('🎉 Migration to MySQL with Digit Sequential IDs (1, 2, 3...) COMPLETED SUCCESSFULLY!');
}

if (process.argv[1] && process.argv[1].includes('migrateToMySQLDigitIds.js')) {
  migrateWithDigitIds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { pool } from '../config/mysql.js';
import { initMySQLTables } from '../config/initMySQL.js';

dotenv.config();

// MongoDB Models
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

export async function migrateAllData() {
  console.log('🚀 Starting Full Migration from MongoDB to MySQL (perfume_shop_center_hayaseri)...');

  // Ensure tables exist
  await initMySQLTables();

  // Connect MongoDB
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/PerFume_Shop_Center_hayaseri';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);
  }

  // 1. Migrate Shops
  const shops = await Shop.find({}).lean();
  console.log(`📦 Migrating ${shops.length} Shops...`);
  for (const s of shops) {
    const id = s._id.toString();
    await pool.query(`
      INSERT INTO shops (id, name, address, status, contactNumber, logoUrl, ownerFullName, ownerEmail, ownerPhone, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), address = VALUES(address), status = VALUES(status),
        contactNumber = VALUES(contactNumber), logoUrl = VALUES(logoUrl),
        ownerFullName = VALUES(ownerFullName), ownerEmail = VALUES(ownerEmail), ownerPhone = VALUES(ownerPhone);
    `, [
      id,
      s.name || 'Perfume Shop Center Hayaseri',
      s.address || '',
      s.status || 'active',
      s.contactNumber || '',
      s.logoUrl || '',
      s.ownerDetails?.fullName || '',
      s.ownerDetails?.email || '',
      s.ownerDetails?.phone || '',
      s.createdAt || new Date(),
      s.updatedAt || new Date()
    ]);
  }

  // 2. Migrate Settings
  const settingsList = await Settings.find({}).lean();
  console.log(`⚙️ Migrating ${settingsList.length} Settings...`);
  for (const st of settingsList) {
    const id = st._id.toString();
    const shopId = st.shopId?.toString() || (shops[0] ? shops[0]._id.toString() : id);
    await pool.query(`
      INSERT INTO settings (id, shopId, shopName, address, phone, email, currency, logoUrl, ownerPassword, taxRate, ownerFullName, ownerEmail, ownerPhone, easypaisaNumber, easypaisaEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        shopName = VALUES(shopName), address = VALUES(address), phone = VALUES(phone), email = VALUES(email),
        currency = VALUES(currency), logoUrl = VALUES(logoUrl), ownerPassword = VALUES(ownerPassword),
        taxRate = VALUES(taxRate), ownerFullName = VALUES(ownerFullName), ownerEmail = VALUES(ownerEmail),
        ownerPhone = VALUES(ownerPhone), easypaisaNumber = VALUES(easypaisaNumber), easypaisaEnabled = VALUES(easypaisaEnabled);
    `, [
      id,
      shopId,
      st.shopName || 'Maidan Perfume Shop',
      st.address || '',
      st.phone || '',
      st.email || '',
      st.currency || 'Rs.',
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

  // 3. Migrate Users (Admin & Staff)
  const users = await User.find({}).lean();
  console.log(`👤 Migrating ${users.length} Users...`);
  for (const u of users) {
    const id = u._id.toString();
    const shopId = u.shopId?.toString() || (shops[0] ? shops[0]._id.toString() : '');
    await pool.query(`
      INSERT INTO users (id, username, password, fullName, role, shopId, status, preferredShift, phoneNumber, email, lastLogged, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username), password = VALUES(password), fullName = VALUES(fullName),
        role = VALUES(role), shopId = VALUES(shopId), status = VALUES(status),
        preferredShift = VALUES(preferredShift), phoneNumber = VALUES(phoneNumber),
        email = VALUES(email), lastLogged = VALUES(lastLogged);
    `, [
      id,
      u.username,
      u.password,
      u.fullName || u.username,
      u.role || 'shop_admin',
      shopId,
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
  const customers = await Customer.find({}).lean();
  console.log(`🛍️ Migrating ${customers.length} Customers...`);
  for (const c of customers) {
    const id = c._id.toString();
    const shopId = c.shopId?.toString() || (shops[0] ? shops[0]._id.toString() : '');
    await pool.query(`
      INSERT INTO customers (id, fullName, email, password, phone, address, shopId, cart, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        fullName = VALUES(fullName), password = VALUES(password), phone = VALUES(phone),
        address = VALUES(address), cart = VALUES(cart);
    `, [
      id,
      c.fullName,
      c.email,
      c.password,
      c.phone || '',
      c.address || '',
      shopId,
      JSON.stringify(c.cart || []),
      c.createdAt || new Date(),
      c.updatedAt || new Date()
    ]);
  }

  // 5. Migrate Items / Products
  const items = await Item.find({}).lean();
  console.log(`🧴 Migrating ${items.length} Products & Items...`);
  for (const it of items) {
    const id = it._id.toString();
    const shopId = it.shopId?.toString() || (shops[0] ? shops[0]._id.toString() : '');
    await pool.query(`
      INSERT INTO items (
        id, shopId, name, category, stock, minStock, price, costPrice, pricePerPeti, pricePerTray, pricePerEgg,
        unitType, petiQuantity, totalPurchaseCost, amountPaidToSupplier, dueAmountToSupplier, supplierName,
        supplierPhone, supplierAddress, supplierPetiPrice, supplierInvoiceNo, supplierInvoiceDate, paymentMethod,
        paymentReceipt, isOnlinePayment, isCompanyStock, images, description, mfgDate, expiryDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), category = VALUES(category), stock = VALUES(stock), minStock = VALUES(minStock),
        price = VALUES(price), costPrice = VALUES(costPrice), pricePerPeti = VALUES(pricePerPeti),
        pricePerTray = VALUES(pricePerTray), pricePerEgg = VALUES(pricePerEgg), unitType = VALUES(unitType),
        petiQuantity = VALUES(petiQuantity), totalPurchaseCost = VALUES(totalPurchaseCost),
        amountPaidToSupplier = VALUES(amountPaidToSupplier), dueAmountToSupplier = VALUES(dueAmountToSupplier),
        supplierName = VALUES(supplierName), supplierPhone = VALUES(supplierPhone), supplierAddress = VALUES(supplierAddress),
        supplierPetiPrice = VALUES(supplierPetiPrice), supplierInvoiceNo = VALUES(supplierInvoiceNo),
        supplierInvoiceDate = VALUES(supplierInvoiceDate), paymentMethod = VALUES(paymentMethod),
        paymentReceipt = VALUES(paymentReceipt), isOnlinePayment = VALUES(isOnlinePayment),
        isCompanyStock = VALUES(isCompanyStock), images = VALUES(images), description = VALUES(description),
        mfgDate = VALUES(mfgDate), expiryDate = VALUES(expiryDate);
    `, [
      id,
      shopId,
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
  const sales = await Sale.find({}).lean();
  console.log(`💰 Migrating ${sales.length} Sales Records...`);
  for (const sl of sales) {
    const id = sl._id.toString();
    const shopId = sl.shopId?.toString() || (shops[0] ? shops[0]._id.toString() : '');
    await pool.query(`
      INSERT INTO sales (
        id, shopId, totalAmount, totalProfit, serialNumber, invoiceNumber, saleDate, status,
        returnReason, cashierId, cashierName, customerName, customerPhone, paymentMethod,
        cashPaid, bankPaid, dueAmount, paymentReceipt, paymentProof, transactionId,
        isCredit, orderId, customerId, customerEmail, isOnlineOrder, orderSource, approvalStatus,
        items, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        totalAmount = VALUES(totalAmount), totalProfit = VALUES(totalProfit), serialNumber = VALUES(serialNumber),
        invoiceNumber = VALUES(invoiceNumber), saleDate = VALUES(saleDate), status = VALUES(status),
        returnReason = VALUES(returnReason), cashierName = VALUES(cashierName), customerName = VALUES(customerName),
        customerPhone = VALUES(customerPhone), paymentMethod = VALUES(paymentMethod), cashPaid = VALUES(cashPaid),
        bankPaid = VALUES(bankPaid), dueAmount = VALUES(dueAmount), paymentReceipt = VALUES(paymentReceipt),
        paymentProof = VALUES(paymentProof), transactionId = VALUES(transactionId), isCredit = VALUES(isCredit),
        approvalStatus = VALUES(approvalStatus), items = VALUES(items);
    `, [
      id,
      shopId,
      sl.totalAmount || 0,
      sl.totalProfit || 0,
      sl.serialNumber || 0,
      sl.invoiceNumber || '',
      sl.saleDate || new Date(),
      sl.status || 'completed',
      sl.returnReason || '',
      sl.cashierId?.toString() || '',
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
      sl.orderId?.toString() || '',
      sl.customerId?.toString() || '',
      sl.customerEmail || '',
      sl.isOnlineOrder ? 1 : 0,
      sl.orderSource || 'WALK_IN_POS',
      sl.approvalStatus || 'APPROVED',
      JSON.stringify(sl.items || []),
      sl.createdAt || new Date(),
      sl.updatedAt || new Date()
    ]);
  }

  // 7. Migrate Expenses
  const expenses = await Expense.find({}).lean();
  console.log(`🧾 Migrating ${expenses.length} Expenses...`);
  for (const ex of expenses) {
    const id = ex._id.toString();
    const shopId = ex.shopId || (shops[0] ? shops[0]._id.toString() : '');
    await pool.query(`
      INSERT INTO expenses (id, shopId, title, category, amount, paymentMethod, paymentSource, expenseDate, notes, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title), category = VALUES(category), amount = VALUES(amount),
        paymentMethod = VALUES(paymentMethod), paymentSource = VALUES(paymentSource),
        expenseDate = VALUES(expenseDate), notes = VALUES(notes), createdBy = VALUES(createdBy);
    `, [
      id,
      shopId,
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
  const damaged = await DamagedProduct.find({}).lean();
  console.log(`⚠️ Migrating ${damaged.length} Damaged Product Records...`);
  for (const dp of damaged) {
    const id = dp._id.toString();
    const shopId = dp.shopId || (shops[0] ? shops[0]._id.toString() : '');
    await pool.query(`
      INSERT INTO damaged_products (
        id, shopId, productName, productId, quantity, petiQuantity, trayQuantity, eggQuantity,
        unitType, deductedEggs, unitPrice, totalLoss, reason, damageDate, notes, reportedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        productName = VALUES(productName), productId = VALUES(productId), quantity = VALUES(quantity),
        petiQuantity = VALUES(petiQuantity), trayQuantity = VALUES(trayQuantity), eggQuantity = VALUES(eggQuantity),
        unitType = VALUES(unitType), deductedEggs = VALUES(deductedEggs), unitPrice = VALUES(unitPrice),
        totalLoss = VALUES(totalLoss), reason = VALUES(reason), damageDate = VALUES(damageDate),
        notes = VALUES(notes), reportedBy = VALUES(reportedBy);
    `, [
      id,
      shopId,
      dp.productName,
      dp.productId || '',
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
  const sessions = await CashSession.find({}).lean();
  console.log(`💼 Migrating ${sessions.length} Cash Sessions...`);
  for (const cs of sessions) {
    const id = cs._id.toString();
    const shopId = cs.shopId?.toString() || (shops[0] ? shops[0]._id.toString() : '');
    await pool.query(`
      INSERT INTO cash_sessions (
        id, shopId, cashierId, startTime, endTime, openingCash, closingCash,
        totalSales, totalReturns, expectedCash, actualCash, cashDifference, status, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        endTime = VALUES(endTime), openingCash = VALUES(openingCash), closingCash = VALUES(closingCash),
        totalSales = VALUES(totalSales), totalReturns = VALUES(totalReturns), expectedCash = VALUES(expectedCash),
        actualCash = VALUES(actualCash), cashDifference = VALUES(cashDifference), status = VALUES(status), notes = VALUES(notes);
    `, [
      id,
      shopId,
      cs.cashierId?.toString() || '',
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
  const orders = await Order.find({}).lean();
  console.log(`🚚 Migrating ${orders.length} Orders...`);
  for (const ord of orders) {
    const id = ord._id.toString();
    const shopId = ord.shopId?.toString() || (shops[0] ? shops[0]._id.toString() : '');
    const customerId = ord.customerId?.toString() || '';
    await pool.query(`
      INSERT INTO orders (
        id, shopId, customerId, items, totalAmount, shippingDetails,
        paymentMethod, paymentStatus, orderStatus, transactionId, paymentProof, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        totalAmount = VALUES(totalAmount), shippingDetails = VALUES(shippingDetails),
        paymentMethod = VALUES(paymentMethod), paymentStatus = VALUES(paymentStatus),
        orderStatus = VALUES(orderStatus), transactionId = VALUES(transactionId), paymentProof = VALUES(paymentProof);
    `, [
      id,
      shopId,
      customerId,
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
  const updates = await SystemUpdate.find({}).lean();
  console.log(`🚀 Migrating ${updates.length} System Updates...`);
  for (const up of updates) {
    const id = up._id.toString();
    await pool.query(`
      INSERT INTO system_updates (id, version, title, description, releaseDate, isCritical, changes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        version = VALUES(version), title = VALUES(title), description = VALUES(description),
        releaseDate = VALUES(releaseDate), isCritical = VALUES(isCritical), changes = VALUES(changes);
    `, [
      id,
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

  console.log('🎉 Full Migration to MySQL (perfume_shop_center_hayaseri) Completed Successfully!');
}

if (process.argv[1] && process.argv[1].includes('migrateFromMongoToMySQL.js')) {
  migrateAllData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

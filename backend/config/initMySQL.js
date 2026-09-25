import bcrypt from 'bcryptjs';
import { pool, testMySQLConnection } from './mysql.js';

export async function initMySQLTables(forceRecreate = false) {
  await testMySQLConnection();

  console.log('🔄 Initializing MySQL tables with Auto-Increment Digit IDs (1, 2, 3...) for perfume_shop_center_hayaseri...');

  if (forceRecreate) {
    const tableNames = [
      'system_updates', 'orders', 'cash_sessions', 'damaged_products',
      'expenses', 'sales', 'items', 'customers', 'users', 'settings', 'shops'
    ];
    for (const tbl of tableNames) {
      await pool.query(`DROP TABLE IF EXISTS \`${tbl}\``);
    }
    console.log('🗑️ Existing tables dropped for clean digit-ID recreation.');
  }

  // 1. Shops Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      status ENUM('active', 'inactive') DEFAULT 'active',
      contactNumber VARCHAR(50),
      logoUrl TEXT,
      ownerFullName VARCHAR(255),
      ownerEmail VARCHAR(255),
      ownerPhone VARCHAR(50),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Settings Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shopId INT NOT NULL,
      shopName VARCHAR(255) DEFAULT 'Maidan Perfume Shop',
      address TEXT,
      phone VARCHAR(50) DEFAULT '',
      email VARCHAR(255) DEFAULT '',
      currency VARCHAR(20) DEFAULT 'Rs.',
      logoUrl TEXT,
      ownerPassword VARCHAR(255) DEFAULT '123456',
      taxRate DECIMAL(10,2) DEFAULT 0,
      ownerFullName VARCHAR(255) DEFAULT '',
      ownerEmail VARCHAR(255) DEFAULT '',
      ownerPhone VARCHAR(50) DEFAULT '',
      easypaisaNumber VARCHAR(50) DEFAULT '',
      easypaisaEnabled TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_settings_shopId (shopId)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      fullName VARCHAR(255) NOT NULL,
      role ENUM('admin', 'cashier', 'salesman', 'shop_admin', 'super_admin') DEFAULT 'shop_admin',
      shopId INT DEFAULT 1,
      status ENUM('active', 'inactive') DEFAULT 'active',
      preferredShift ENUM('day', 'night', 'both') DEFAULT 'both',
      phoneNumber VARCHAR(50),
      email VARCHAR(255),
      lastLogged DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_users_shopId (shopId)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Customers Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullName VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      address TEXT,
      shopId INT DEFAULT 1,
      cart JSON,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_customers_shopId (shopId)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Items / Products Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shopId INT DEFAULT 1,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      minStock INT NOT NULL DEFAULT 0,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      costPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
      pricePerPeti DECIMAL(12,2) DEFAULT 0,
      pricePerTray DECIMAL(12,2) DEFAULT 0,
      pricePerEgg DECIMAL(12,2) DEFAULT 0,
      unitType VARCHAR(50) DEFAULT 'egg',
      petiQuantity INT DEFAULT 0,
      totalPurchaseCost DECIMAL(14,2) DEFAULT 0,
      amountPaidToSupplier DECIMAL(14,2) DEFAULT 0,
      dueAmountToSupplier DECIMAL(14,2) DEFAULT 0,
      supplierName VARCHAR(255) DEFAULT '',
      supplierPhone VARCHAR(50) DEFAULT '',
      supplierAddress TEXT,
      supplierPetiPrice DECIMAL(12,2) DEFAULT 0,
      supplierInvoiceNo VARCHAR(100) DEFAULT '',
      supplierInvoiceDate DATETIME,
      paymentMethod VARCHAR(50) DEFAULT 'CASH',
      paymentReceipt TEXT,
      isOnlinePayment TINYINT(1) DEFAULT 0,
      isCompanyStock TINYINT(1) DEFAULT 0,
      images JSON,
      description TEXT,
      mfgDate DATETIME,
      expiryDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_items_shopId (shopId),
      KEY idx_items_category (category)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Sales Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shopId INT DEFAULT 1,
      totalAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
      totalProfit DECIMAL(14,2) DEFAULT 0,
      serialNumber INT DEFAULT 0,
      invoiceNumber VARCHAR(100) DEFAULT '',
      saleDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'completed',
      returnReason TEXT,
      cashierId INT DEFAULT 1,
      cashierName VARCHAR(255),
      customerName VARCHAR(255) DEFAULT '',
      customerPhone VARCHAR(50) DEFAULT '',
      paymentMethod VARCHAR(50) DEFAULT 'CASH',
      cashPaid DECIMAL(14,2) DEFAULT 0,
      bankPaid DECIMAL(14,2) DEFAULT 0,
      dueAmount DECIMAL(14,2) DEFAULT 0,
      paymentReceipt TEXT,
      paymentProof TEXT,
      transactionId VARCHAR(255) DEFAULT '',
      isCredit TINYINT(1) DEFAULT 0,
      orderId INT DEFAULT NULL,
      customerId INT DEFAULT NULL,
      customerEmail VARCHAR(255) DEFAULT '',
      isOnlineOrder TINYINT(1) DEFAULT 0,
      orderSource VARCHAR(50) DEFAULT 'WALK_IN_POS',
      approvalStatus VARCHAR(50) DEFAULT 'APPROVED',
      items JSON,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sales_shopId (shopId),
      KEY idx_sales_saleDate (saleDate)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. Expenses Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shopId INT DEFAULT 1,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT 'Other',
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      paymentMethod VARCHAR(50) DEFAULT 'CASH',
      paymentSource VARCHAR(50) DEFAULT 'CASH',
      expenseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      createdBy VARCHAR(255) DEFAULT 'Shop Admin',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_expenses_shopId (shopId)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Damaged Products Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS damaged_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shopId INT DEFAULT 1,
      productName VARCHAR(255) NOT NULL,
      productId INT DEFAULT NULL,
      quantity INT DEFAULT 0,
      petiQuantity INT DEFAULT 0,
      trayQuantity INT DEFAULT 0,
      eggQuantity INT DEFAULT 0,
      unitType VARCHAR(50) DEFAULT 'single',
      deductedEggs INT DEFAULT 0,
      unitPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
      totalLoss DECIMAL(14,2) NOT NULL DEFAULT 0,
      reason VARCHAR(255) DEFAULT 'Defective Stock',
      damageDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      reportedBy VARCHAR(255) DEFAULT 'Shop Admin',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_damaged_shopId (shopId)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Cash Sessions (Shifts) Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cash_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shopId INT DEFAULT 1,
      cashierId INT DEFAULT 1,
      startTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      endTime DATETIME,
      openingCash DECIMAL(12,2) NOT NULL DEFAULT 0,
      closingCash DECIMAL(12,2) DEFAULT 0,
      totalSales DECIMAL(14,2) DEFAULT 0,
      totalReturns DECIMAL(14,2) DEFAULT 0,
      expectedCash DECIMAL(14,2) DEFAULT 0,
      actualCash DECIMAL(14,2) DEFAULT 0,
      cashDifference DECIMAL(14,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sessions_shopId (shopId)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. Orders Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shopId INT DEFAULT 1,
      customerId INT DEFAULT NULL,
      items JSON,
      totalAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
      shippingDetails JSON,
      paymentMethod VARCHAR(50) NOT NULL DEFAULT 'COD',
      paymentStatus VARCHAR(50) DEFAULT 'PENDING',
      orderStatus VARCHAR(50) DEFAULT 'PROCESSING',
      transactionId VARCHAR(255),
      paymentProof TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_orders_shopId (shopId),
      KEY idx_orders_customerId (customerId)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed Default Super Admin and Default Shop if not present
  try {
    const [superAdmins] = await pool.query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);
    if (superAdmins.length === 0) {
      const hashedPass = await bcrypt.hash('super12345', 10);
      await pool.query(`
        INSERT INTO users (username, password, fullName, role, email, status)
        VALUES ('sohail1592000@gmail.com', ?, 'Super Administrator', 'super_admin', 'sohail1592000@gmail.com', 'active')
      `, [hashedPass]);
      console.log('👑 Default Super Admin created: sohail1592000@gmail.com / super12345');
    }

    // Check if at least one shop exists
    const [existingShops] = await pool.query(`SELECT id FROM shops LIMIT 1`);
    if (existingShops.length === 0) {
      await pool.query(`
        INSERT INTO shops (id, name, address, contactNumber, ownerFullName, ownerEmail, status)
        VALUES (1, 'Hyasire Genral Store', 'Attock, Pakistan', '03001234567', 'Hyasire Admin', 'hayaserishopadmin@gmail.com', 'active')
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `);
      
      const hashedShopPass = await bcrypt.hash('123456', 10);
      const [existingShopAdmin] = await pool.query(`SELECT id FROM users WHERE username = 'hayaserishopadmin@gmail.com' LIMIT 1`);
      if (existingShopAdmin.length === 0) {
        await pool.query(`
          INSERT INTO users (username, password, fullName, role, shopId, email, status)
          VALUES ('hayaserishopadmin@gmail.com', ?, 'Hyasire Shop Admin', 'shop_admin', 1, 'hayaserishopadmin@gmail.com', 'active')
        `, [hashedShopPass]);
      }

      await pool.query(`
        INSERT INTO settings (shopId, shopName, address, phone, ownerFullName, ownerEmail, ownerPassword, easypaisaNumber, easypaisaEnabled)
        VALUES (1, 'Hyasire Genral Store', 'Attock, Pakistan', '03001234567', 'Hyasire Admin', 'hayaserishopadmin@gmail.com', '123456', '03001234567', 1)
        ON DUPLICATE KEY UPDATE shopName = VALUES(shopName)
      `);
      console.log('🏪 Default Shop created: Hyasire Genral Store (ID 1) with Admin: hayaserishopadmin@gmail.com / 123456');
    }
  } catch (seedErr) {
    console.error('Error seeding default MySQL data:', seedErr);
  }

  console.log('✅ All MySQL tables created with Auto-Increment Digit IDs (1, 2, 3...)!');
}

import { pool } from '../config/mysql.js';
import bcrypt from 'bcryptjs';

/**
 * Finds an existing customer or dynamically registers a new customer in MySQL `customers` table.
 * Matches by customerId, phone number, email, or full name for the given shopId.
 */
export async function findOrCreateCustomer({
  shopId = 1,
  customerName = '',
  customerPhone = '',
  customerEmail = '',
  customerAddress = '',
  customerId = null
}) {
  const numericShopId = Number(shopId) || 1;
  const trimmedName = (customerName || '').trim();
  const trimmedPhone = (customerPhone || '').trim();
  const cleanPhoneDigits = trimmedPhone.replace(/\D/g, '');
  const trimmedEmail = (customerEmail || '').trim().toLowerCase();

  // 1. If explicit customerId is provided, look up customer by ID
  if (customerId && customerId !== '0' && customerId !== 0 && customerId !== 'undefined' && customerId !== 'null') {
    try {
      const [byId] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
      if (byId.length > 0) {
        const cust = byId[0];
        // If phone or address was empty, update with newly provided values
        const updates = [];
        const params = [];
        if (trimmedPhone && (!cust.phone || cust.phone.trim() === '')) {
          updates.push('phone = ?');
          params.push(trimmedPhone);
          cust.phone = trimmedPhone;
        }
        if (customerAddress && (!cust.address || cust.address.trim() === '')) {
          updates.push('address = ?');
          params.push(customerAddress.trim());
          cust.address = customerAddress.trim();
        }
        if (updates.length > 0) {
          params.push(cust.id);
          await pool.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);
        }
        return { customer: { ...cust, _id: String(cust.id) }, customerId: cust.id, isNew: false };
      }
    } catch (err) {
      console.warn('Lookup by customerId error:', err);
    }
  }

  // 2. Check if anonymous / generic walk-in without contact details
  const isGenericWalkIn = (!trimmedName || trimmedName.toLowerCase() === 'walk-in customer' || trimmedName.toLowerCase() === 'walkin customer')
    && !trimmedPhone && !trimmedEmail;
  if (isGenericWalkIn) {
    return { customer: null, customerId: null, isNew: false };
  }

  const effectiveName = trimmedName && trimmedName.toLowerCase() !== 'walk-in customer' && trimmedName.toLowerCase() !== 'walkin customer'
    ? trimmedName
    : (trimmedPhone ? `Customer ${trimmedPhone}` : 'Walk-in Customer');

  // 3. Match by Phone Number (if phone has at least 7 digits)
  if (cleanPhoneDigits.length >= 7) {
    try {
      const [byPhone] = await pool.query(
        `SELECT * FROM customers 
         WHERE shopId = ? 
           AND (phone = ? OR REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '+', '') LIKE ?) 
         LIMIT 1`,
        [numericShopId, trimmedPhone, `%${cleanPhoneDigits}%`]
      );
      if (byPhone.length > 0) {
        const cust = byPhone[0];
        // Update customer name if previously generic
        if (effectiveName && (!cust.fullName || cust.fullName.toLowerCase().includes('walk-in') || cust.fullName.toLowerCase().includes('customer '))) {
          await pool.query('UPDATE customers SET fullName = ? WHERE id = ?', [effectiveName, cust.id]);
          cust.fullName = effectiveName;
        }
        return { customer: { ...cust, _id: String(cust.id) }, customerId: cust.id, isNew: false };
      }
    } catch (err) {
      console.warn('Match by phone error:', err);
    }
  }

  // 4. Match by Email (if provided)
  if (trimmedEmail) {
    try {
      const [byEmail] = await pool.query(
        `SELECT * FROM customers WHERE shopId = ? AND LOWER(email) = ? LIMIT 1`,
        [numericShopId, trimmedEmail]
      );
      if (byEmail.length > 0) {
        const cust = byEmail[0];
        if (trimmedPhone && (!cust.phone || cust.phone.trim() === '')) {
          await pool.query('UPDATE customers SET phone = ? WHERE id = ?', [trimmedPhone, cust.id]);
          cust.phone = trimmedPhone;
        }
        return { customer: { ...cust, _id: String(cust.id) }, customerId: cust.id, isNew: false };
      }
    } catch (err) {
      console.warn('Match by email error:', err);
    }
  }

  // 5. Match by Full Name in the same shop (case-insensitive)
  if (effectiveName && effectiveName.toLowerCase() !== 'walk-in customer') {
    try {
      const [byName] = await pool.query(
        `SELECT * FROM customers WHERE shopId = ? AND LOWER(TRIM(fullName)) = LOWER(TRIM(?)) LIMIT 1`,
        [numericShopId, effectiveName]
      );
      if (byName.length > 0) {
        const cust = byName[0];
        if (trimmedPhone && (!cust.phone || cust.phone.trim() === '')) {
          await pool.query('UPDATE customers SET phone = ? WHERE id = ?', [trimmedPhone, cust.id]);
          cust.phone = trimmedPhone;
        }
        return { customer: { ...cust, _id: String(cust.id) }, customerId: cust.id, isNew: false };
      }
    } catch (err) {
      console.warn('Match by name error:', err);
    }
  }

  // 6. Customer not found -> DYNAMICALLY INSERT NEW REGISTERED CUSTOMER IN MYSQL!
  let finalEmail = trimmedEmail;
  if (!finalEmail) {
    const safeSlug = effectiveName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) || 'cust';
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    finalEmail = cleanPhoneDigits ? `${cleanPhoneDigits}@customer.pos` : `${safeSlug}_${randSuffix}@customer.pos`;
  }

  // Verify unique email collision in table
  try {
    const [emailCheck] = await pool.query(`SELECT id FROM customers WHERE email = ?`, [finalEmail]);
    if (emailCheck.length > 0) {
      finalEmail = `cust_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}@customer.pos`;
    }
  } catch (e) {
    // ignore
  }

  const hashedPassword = await bcrypt.hash('123456', 10);

  const [insertResult] = await pool.query(`
    INSERT INTO customers (
      fullName, email, password, phone, address, shopId, cart, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, '[]', NOW(), NOW())
  `, [
    effectiveName,
    finalEmail,
    hashedPassword,
    trimmedPhone,
    customerAddress || '',
    numericShopId
  ]);

  const newCustId = insertResult.insertId;
  const [newCustRows] = await pool.query(`SELECT * FROM customers WHERE id = ?`, [newCustId]);
  const newCust = newCustRows[0] || {
    id: newCustId,
    fullName: effectiveName,
    email: finalEmail,
    phone: trimmedPhone,
    address: customerAddress || '',
    shopId: numericShopId
  };

  return {
    customer: { ...newCust, _id: String(newCustId) },
    customerId: newCustId,
    isNew: true
  };
}

/**
 * Scans all sales records for a shop and ensures that any customer mentioned in sales
 * is properly registered in MySQL `customers` table and linked via `sales.customerId`.
 */
export async function syncCustomersFromSales(shopId = 1) {
  const numericShopId = Number(shopId) || 1;
  const [sales] = await pool.query(`
    SELECT id, customerName, customerPhone, customerEmail, customerId, totalAmount, dueAmount, isCredit, invoiceNumber, saleDate, cashierName
    FROM sales
    WHERE shopId = ? AND (
      (customerName IS NOT NULL AND customerName != '' AND LOWER(TRIM(customerName)) != 'walk-in customer' AND LOWER(TRIM(customerName)) != 'walkin customer')
      OR (customerPhone IS NOT NULL AND customerPhone != '')
    )
    ORDER BY id ASC
  `, [numericShopId]);

  let syncedCount = 0;
  for (const sale of sales) {
    const result = await findOrCreateCustomer({
      shopId: numericShopId,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerEmail: sale.customerEmail,
      customerId: sale.customerId
    });

    if (result && result.customerId) {
      if (sale.customerId !== result.customerId) {
        await pool.query(
          `UPDATE sales SET customerId = ?, customerEmail = COALESCE(NULLIF(customerEmail, ''), ?) WHERE id = ?`,
          [result.customerId, result.customer?.email || '', sale.id]
        );
        syncedCount++;
      }

      // Also ensure customer_credits is linked if applicable
      try {
        await pool.query(
          `UPDATE customer_credits SET customerId = ? WHERE saleId = ? AND (customerId IS NULL OR customerId = 0)`,
          [result.customerId, sale.id]
        );
      } catch (ccErr) {
        // ignore
      }
    }
  }

  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) as count FROM customers WHERE shopId = ?`,
    [numericShopId]
  );

  return {
    success: true,
    syncedSales: syncedCount,
    totalSalesChecked: sales.length,
    registeredCustomersCount: count
  };
}

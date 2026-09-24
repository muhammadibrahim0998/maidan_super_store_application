import express from 'express';
import Item from '../models/Item.js';
import Settings from '../models/Settings.js';
import Shop from '../models/Shop.js';
import { resolveShopId } from '../utils/shopResolver.js';

const router = express.Router();

// GET /api/catalog/:shopId  — public, no auth needed
router.get('/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { search, category } = req.query;

    const resolvedId = await resolveShopId(shopId);
    const shop = await Shop.findById(resolvedId).select('name address contactNumber status logoUrl');
    if (!shop || shop.status !== 'active') {
      return res.status(404).json({ message: 'Shop not found or inactive' });
    }

    const realShopId = shop._id;
    const settings = await Settings.findOne({ shopId: realShopId }).select('shopName logoUrl currency address phone');

    const filter = { shopId: realShopId };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'All') {
      filter.category = category;
    }

    const rawItems = await Item.find(filter).sort({ name: 1 });
    const items = rawItems.map(item => {
      const itemObj = typeof item.toObject === 'function' ? item.toObject() : item;
      const pMethod = String(itemObj.paymentMethod || '').trim().toLowerCase();
      const isOnline = itemObj.isOnlinePayment === true || Boolean(itemObj.paymentReceipt) || (
        pMethod.includes('bank') || pMethod.includes('easy') || pMethod.includes('jazz') || pMethod.includes('online') || pMethod.includes('cheque') || pMethod.includes('transfer') || pMethod.includes('card')
      );
      itemObj.isOnlinePayment = isOnline;

      const petiQty = Number(itemObj.petiQuantity) || 0;
      const stock = Number(itemObj.stock) || 0;
      const unitCost = Number(itemObj.costPrice) > 0 ? Number(itemObj.costPrice) : Number(itemObj.price || 0);
      const unitDivisor = itemObj.unitType === 'egg' ? 1 : itemObj.unitType === 'tray' ? 30 : 360;

      const calculatedCost = Number(itemObj.totalPurchaseCost) > 0
        ? Number(itemObj.totalPurchaseCost)
        : (petiQty > 0 ? petiQty * unitCost : (stock > 0 ? stock * (unitCost / unitDivisor) : 0));
      
      itemObj.totalPurchaseCost = Math.round(calculatedCost);

      const isCreditMethod = pMethod.includes('credit') || pMethod.includes('due') || pMethod.includes('partial');
      const hasExplicitDue = itemObj.dueAmountToSupplier !== undefined && itemObj.dueAmountToSupplier !== null && Number(itemObj.dueAmountToSupplier) > 0;

      if (hasExplicitDue || isCreditMethod) {
        const rawDue = hasExplicitDue ? Number(itemObj.dueAmountToSupplier) : itemObj.totalPurchaseCost;
        itemObj.dueAmountToSupplier = Math.min(itemObj.totalPurchaseCost, Math.max(0, rawDue));
        itemObj.amountPaidToSupplier = Math.max(0, itemObj.totalPurchaseCost - itemObj.dueAmountToSupplier);
      } else {
        // 100% Cash / Bank Paid (No Credit)
        itemObj.amountPaidToSupplier = itemObj.totalPurchaseCost;
        itemObj.dueAmountToSupplier = 0;
      }

      return itemObj;
    });

    // Get unique categories strictly from existing items in this shop
    const allItems = await Item.find({ shopId: realShopId }).select('category');
    const existingCats = Array.from(new Set(allItems.map(i => i.category?.trim()).filter(Boolean)));
    const categories = ['All', ...existingCats];

    res.json({
      shop: {
        name: settings?.shopName || shop.name,
        address: settings?.address || shop.address,
        phone: settings?.phone || shop.contactNumber,
        logoUrl: settings?.logoUrl || shop.logoUrl,
        currency: (!settings?.currency || settings.currency === '$') ? 'Rs.' : settings.currency
      },
      items,
      categories
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/catalog  — list all active shops (for multi-shop entry)
router.get('/', async (req, res) => {
  try {
    const shops = await Shop.find({ status: 'active' }).select('name address contactNumber logoUrl');
    res.json(shops);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

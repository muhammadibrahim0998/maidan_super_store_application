import express from 'express';
import mongoose from 'mongoose';
import DamagedProduct from '../models/DamagedProduct.js';
import Item from '../models/Item.js';
import { resolveShopId } from '../utils/shopResolver.js';

const router = express.Router();

// GET all damaged product logs for a shop
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const realShopId = await resolveShopId(shopId);
    const records = await DamagedProduct.find({ shopId: realShopId }).sort({ damageDate: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST log a new damaged product entry & deduct from product inventory stock
router.post('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const realShopId = await resolveShopId(shopId);
    const { productName, productId, quantity, unitType, petiQuantity, trayQuantity, eggQuantity, unitPrice, totalLoss, reason, damageDate, notes, reportedBy } = req.body;

    const pQty = Number(petiQuantity || 0);
    const tQty = Number(trayQuantity || 0);
    const eQty = Number(eggQuantity || 0);
    const rawQty = Number(quantity || 0);

    if (!productName || (pQty <= 0 && tQty <= 0 && eQty <= 0 && rawQty <= 0)) {
      return res.status(400).json({ success: false, message: 'Product name and damaged quantity (Petis, Trays or Eggs) are required' });
    }

    const price = Number(unitPrice || 0);
    const unit = String(unitType || 'egg').toLowerCase().trim();

    // Find the item to deduct stock from
    let item = null;
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      item = await Item.findOne({ _id: productId, shopId: realShopId });
    }
    if (!item && productName) {
      item = await Item.findOne({ 
        shopId: realShopId, 
        name: { $regex: new RegExp(`^${productName.trim()}$`, 'i') } 
      });
    }

    const traysPerPeti = item?.traysPerPeti || 12;
    const eggsPerTray = item?.eggsPerTray || 30;
    const ePerP = traysPerPeti * eggsPerTray;
    const ePerT = eggsPerTray;

    let deductedEggs = 0;
    if (pQty > 0 || tQty > 0 || eQty > 0) {
      deductedEggs = Math.round((pQty * ePerP) + (tQty * ePerT) + eQty);
    } else if (unit === 'peti') {
      deductedEggs = Math.round(rawQty * ePerP);
    } else if (unit === 'tray') {
      deductedEggs = Math.round(rawQty * ePerT);
    } else {
      deductedEggs = Math.round(rawQty);
    }

    if (item) {
      const currentStockEggs = item.stock || (item.petiQuantity ? Math.round(item.petiQuantity * ePerP) : (item.eggQuantity || 0)) || 0;
      const newStock = Math.max(0, currentStockEggs - deductedEggs);

      item.stock = newStock;
      item.petiQuantity = Number((newStock / ePerP).toFixed(2));
      item.trayQuantity = Number((newStock / ePerT).toFixed(1));
      item.eggQuantity = newStock;
      await item.save();
    }

    const loss = totalLoss !== undefined ? Number(totalLoss) : (deductedEggs * (price / (unit === 'peti' ? ePerP : (unit === 'tray' ? ePerT : 1))));

    const newRecord = new DamagedProduct({
      shopId: realShopId,
      productName,
      productId: item ? String(item._id) : (productId || ''),
      quantity: rawQty > 0 ? rawQty : (pQty > 0 ? pQty : (tQty > 0 ? tQty : eQty)),
      petiQuantity: pQty,
      trayQuantity: tQty,
      eggQuantity: eQty,
      unitType: unit,
      deductedEggs: deductedEggs,
      unitPrice: price,
      totalLoss: loss,
      reason: reason || 'Egg Breakage / Crack',
      damageDate: damageDate ? new Date(damageDate) : new Date(),
      notes: notes || '',
      reportedBy: reportedBy || 'Shop Admin'
    });

    await newRecord.save();
    res.status(201).json({ success: true, data: newRecord, updatedItem: item });
  } catch (error) {
    console.error('[DamagedProduct save error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE a damaged product log entry by ID & restore inventory stock
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await DamagedProduct.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Damaged record not found' });
    }

    // Restore stock to Item if found
    if (record.productId && mongoose.Types.ObjectId.isValid(record.productId)) {
      const item = await Item.findById(record.productId);
      if (item && record.deductedEggs > 0) {
        const traysPerPeti = item.traysPerPeti || 12;
        const eggsPerTray = item.eggsPerTray || 30;
        const ePerP = traysPerPeti * eggsPerTray;
        const ePerT = eggsPerTray;

        const currentStockEggs = item.stock || 0;
        const restoredStock = currentStockEggs + record.deductedEggs;
        item.stock = restoredStock;
        item.petiQuantity = Number((restoredStock / ePerP).toFixed(2));
        item.trayQuantity = Number((restoredStock / ePerT).toFixed(1));
        item.eggQuantity = restoredStock;
        await item.save();
      }
    }

    await DamagedProduct.findByIdAndDelete(id);
    res.json({ success: true, message: 'Damaged product entry deleted and stock restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

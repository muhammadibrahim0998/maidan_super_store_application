import express from 'express';
import { authenticate, requireShopAdmin } from '../middleware/auth.js';
import { validateProduct } from '../validators/productValidator.js';
const router = express.Router();
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  settleSupplierCredit
} from '../controllers/itemController.js';

import Item from '../models/Item.js';

// Public endpoint for showcase images on login background slider (no auth required)
router.get('/public/showcase', async (req, res) => {
  try {
    const items = await Item.find({
      images: { $exists: true, $not: { $size: 0 } }
    }).select('name category images price').lean();

    const showcaseImages = [];
    items.forEach(item => {
      if (Array.isArray(item.images)) {
        item.images.forEach(imgUrl => {
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
            showcaseImages.push({
              url: imgUrl,
              title: item.name,
              category: item.category,
              price: item.price
            });
          }
        });
      }
    });

    res.json({ success: true, count: showcaseImages.length, images: showcaseImages });
  } catch (error) {
    console.error('Error fetching showcase items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.route('/')
  .get(authenticate, getItems)
  .post(authenticate, requireShopAdmin, validateProduct, createItem);

router.route('/all')
  .get(authenticate, getItems);

router.patch('/:id/settle-credit', authenticate, requireShopAdmin, settleSupplierCredit);
router.patch('/:id/settle-cash', authenticate, requireShopAdmin, settleSupplierCredit);
router.patch('/:id/settle-bank', authenticate, requireShopAdmin, settleSupplierCredit);

router.route('/:id')
  .get(authenticate, getItem)
  .put(authenticate, requireShopAdmin, validateProduct, updateItem)
  .delete(authenticate, requireShopAdmin, deleteItem);

export default router;

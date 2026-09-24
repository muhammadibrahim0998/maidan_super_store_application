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

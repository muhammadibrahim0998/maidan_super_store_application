import mongoose from 'mongoose';
import Shop from '../models/Shop.js';

export async function resolveShopId(inputShopId) {
  if (!inputShopId) return null;

  const raw = String(inputShopId).trim();

  // 1. If numeric digit (1, 2, 3...), lookup shop by 1-based index
  if (/^\d+$/.test(raw)) {
    const idx = parseInt(raw, 10) - 1;
    const shops = await Shop.find({ status: 'active' }).sort({ createdAt: 1 }).select('_id name');
    if (idx >= 0 && idx < shops.length) {
      return String(shops[idx]._id);
    }
  }

  // 2. If valid 24-char MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(raw)) {
    const s = await Shop.findById(raw).select('_id');
    if (s) return String(s._id);
  }

  // 3. Find by name / slug regex (e.g. 'peshawar', 'attock', 'mardan')
  const sByName = await Shop.findOne({ name: { $regex: raw, $options: 'i' }, status: 'active' }).select('_id');
  if (sByName) return String(sByName._id);

  // 4. Fallback to first active shop in database
  const first = await Shop.findOne({ status: 'active' }).sort({ createdAt: 1 }).select('_id');
  return first ? String(first._id) : raw;
}

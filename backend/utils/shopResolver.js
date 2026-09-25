import Shop from '../models/Shop.js';

export async function resolveShopId(inputShopId) {
  if (!inputShopId) return 1;

  const raw = String(inputShopId).trim();

  // 1. If numeric digit (1, 2, 3...)
  if (/^\d+$/.test(raw)) {
    const numId = parseInt(raw, 10);
    const s = await Shop.findById(numId);
    if (s) return s.id;
    return numId;
  }

  // 2. Find by name regex
  const sByName = await Shop.findOne({ name: { $regex: raw, $options: 'i' }, status: 'active' });
  if (sByName) return sByName.id;

  // 3. Fallback to first active shop in database
  const first = await Shop.findOne({ status: 'active' }).sort({ createdAt: 1 });
  return first ? first.id : 1;
}

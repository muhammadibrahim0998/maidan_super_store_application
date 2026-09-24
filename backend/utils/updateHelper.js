import SystemUpdate from '../models/SystemUpdate.js';

/**
 * Creates or updates a system update entry.
 * If an update for the same category exists from the last 24 hours, it appends the item.
 * Otherwise, it creates a new entry.
 */
export const logSystemUpdate = async (category, iconType, item) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find a recent active update in the same category
    let update = await SystemUpdate.findOne({
      category,
      isActive: true,
      createdAt: { $gte: oneDayAgo }
    });

    if (update) {
      // Avoid duplicate items in the same update entry
      if (!update.items.includes(item)) {
        update.items.push(item);
        await update.save();
      }
    } else {
      // Create new update entry
      update = new SystemUpdate({
        category,
        iconType,
        items: [item]
      });
      await update.save();
    }
    return update;
  } catch (err) {
    console.error("Failed to log system update:", err);
  }
};

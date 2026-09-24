import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Item from './models/Item.js';

dotenv.config();

const updateDatabaseEggs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/egge');
    console.log('✅ Connected to egge database');

    const result = await Item.updateMany(
      {},
      { $set: { images: ['/egg.png'] } }
    );

    console.log(`✅ Updated ${result.modifiedCount} items in database with egg picture '/egg.png'`);

    const items = await Item.find({}).select('name category images price stock');
    console.log('\n--- Current Items in DB ---');
    items.forEach(i => console.log(`• ${i.name} | Category: ${i.category} | Image: ${i.images[0]}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    process.exit(1);
  }
};

updateDatabaseEggs();

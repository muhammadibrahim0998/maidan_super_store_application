import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/perfume_store');

    // Only create or update the initial door-opener (Super Admin)
    let superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      superAdmin = new User({
        username: 'sohail1592000@gmail.com',
        password: 'super12345',
        fullName: 'System Super Admin',
        role: 'super_admin'
      });
      await superAdmin.save();
      console.log('✅ Super Admin created. Email: sohail1592000@gmail.com');
    } else {
      superAdmin.username = 'sohail1592000@gmail.com';
      superAdmin.password = 'super12345';
      await superAdmin.save();
      console.log('✅ Super Admin updated. Email: sohail1592000@gmail.com');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedDB();

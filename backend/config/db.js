import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/perfume_store';
    const isAtlas = uri.includes('mongodb.net');
    
    console.log(`Attempting to connect to ${isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'}...`);
    
    // Set a shorter timeout for Atlas in development to avoid long hangs
    const options = isAtlas ? { serverSelectionTimeoutMS: 5000 } : {};
    
    const conn = await mongoose.connect(uri, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('⚠️ Server will continue to run, but database operations will fail.');
    // Do NOT exit process, let the server stay alive so frontend doesn't get "Network Error"
  }
};

export default connectDB;

import { initMySQLTables } from './initMySQL.js';
import { testMySQLConnection } from './mysql.js';

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MySQL database (perfume_shop_center_hayaseri)...');
    await testMySQLConnection();
    await initMySQLTables();
    console.log('✅ MySQL Database Connected & Initialized: perfume_shop_center_hayaseri');
  } catch (error) {
    console.error(`❌ MySQL Connection Error: ${error.message}`);
    console.log('⚠️ Server will continue to run, but database operations will fail.');
  }
};

export default connectDB;

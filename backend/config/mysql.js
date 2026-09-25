import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.MYSQL_PORT) || 3306;
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.MYSQL_DATABASE || 'perfume_shop_center_hayaseri';

// Create connection pool
export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  dateStrings: true,
  decimalNumbers: true
});

// Helper for single query execution
export async function query(sql, params = []) {
  try {
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('MySQL Query Error:', error.message, 'SQL:', sql);
    throw error;
  }
}

// Check connection
export async function testMySQLConnection() {
  try {
    // First ensure database exists
    const rootConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    const [result] = await pool.query('SELECT 1 + 1 AS solution');
    console.log(`✅ MySQL Connected: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    return true;
  } catch (err) {
    console.error(`❌ MySQL Connection Error on ${DB_HOST}:${DB_PORT}/${DB_NAME}:`, err.message);
    return false;
  }
}

export default pool;

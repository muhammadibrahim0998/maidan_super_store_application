import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let DB_HOST = process.env.MYSQL_HOST || process.env.MYSQLHOST || '127.0.0.1';
let DB_PORT = Number(process.env.MYSQL_PORT || process.env.MYSQLPORT) || 3306;
let DB_USER = process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
let DB_PASSWORD = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
let DB_NAME = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'perfume_shop_center_hayaseri';

// Support single cloud database URL (Railway, PlanetScale, Aiven, Cleardb, etc.)
const dbUri = process.env.DATABASE_URL || process.env.MYSQL_URL;
if (dbUri) {
  try {
    const parsed = new URL(dbUri);
    DB_HOST = parsed.hostname;
    DB_PORT = Number(parsed.port) || 3306;
    DB_USER = decodeURIComponent(parsed.username || '');
    DB_PASSWORD = decodeURIComponent(parsed.password || '');
    DB_NAME = (parsed.pathname || '').replace(/^\//, '') || DB_NAME;
  } catch (err) {
    console.warn('Could not parse DATABASE_URL/MYSQL_URL, using individual MYSQL_* env vars');
  }
}

// SSL Configuration for Cloud MySQL (Railway, Aiven, Clever Cloud, PlanetScale, etc.)
const useSSL = process.env.MYSQL_SSL === 'true' || 
               process.env.MYSQL_SSL === '1' || 
               (dbUri && (dbUri.includes('sslmode=') || dbUri.includes('ssl=')));
const sslConfig = useSSL ? { rejectUnauthorized: false } : undefined;

// Create connection pool
export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: sslConfig,
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
    // Attempt to ensure database exists if permissions allow (local development / root user)
    try {
      const rootConn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        ...(sslConfig ? { ssl: sslConfig } : {})
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await rootConn.end();
    } catch (createErr) {
      // In cloud providers (Railway, PlanetScale, RDS), the database already exists and CREATE DATABASE throws an access denied error.
      // We safely catch this so it does not block the application.
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MySQL Info] Notice during CREATE DATABASE check: ${createErr.message}`);
      }
    }

    const [result] = await pool.query('SELECT 1 + 1 AS solution');
    console.log(`✅ MySQL Connected successfully: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    return true;
  } catch (err) {
    console.error(`❌ MySQL Connection Error on ${DB_HOST}:${DB_PORT}/${DB_NAME}:`, err.message);
    return false;
  }
}

export default pool;

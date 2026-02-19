const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingVars.length) {
  throw new Error(`Missing required DB environment variables: ${missingVars.join(', ')}`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool
  .getConnection()
  .then((connection) => connection.release())
  .catch((error) => {
    if (error && error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(
        `MySQL authentication failed for user "${process.env.DB_USER}" at "${process.env.DB_HOST}:${process.env.DB_PORT || 3306}". ` +
          'Update DB_USER/DB_PASSWORD in backend/.env or create that MySQL user with access to DB_NAME.'
      );
      return;
    }
    console.error('MySQL connection error:', error.message);
  });

module.exports = pool;

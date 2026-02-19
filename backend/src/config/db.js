const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const resolvedConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE
};

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingVars = requiredEnvVars.filter((name) => {
  if (name === 'DB_HOST') return !resolvedConfig.host;
  if (name === 'DB_USER') return !resolvedConfig.user;
  if (name === 'DB_NAME') return !resolvedConfig.database;
  return false;
});

if (missingVars.length) {
  throw new Error(`Missing required DB environment variables: ${missingVars.join(', ')}`);
}

const pool = mysql.createPool({
  host: resolvedConfig.host,
  port: resolvedConfig.port,
  user: resolvedConfig.user,
  password: resolvedConfig.password,
  database: resolvedConfig.database,
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
        `MySQL authentication failed for user "${resolvedConfig.user}" at "${resolvedConfig.host}:${resolvedConfig.port}". ` +
          'Update DB_* (or MYSQL*) variables and ensure this user has access to the target database.'
      );
      return;
    }
    console.error('MySQL connection error:', error.message);
  });

module.exports = pool;

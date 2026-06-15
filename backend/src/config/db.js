const { Pool } = require('pg');
require('dotenv').config();

const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || (isVercel ? 'db.npeledlithnaolqgnuqq.supabase.co' : 'localhost'),
  database: process.env.DB_DATABASE || (isVercel ? 'postgres' : 'sales_db'),
  password: process.env.DB_PASSWORD || (isVercel ? 'Coke@20152025' : '123456'),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: isVercel ? { rejectUnauthorized: false } : undefined,
});

let _isConnected = false;

const setConnected = (val) => {
  _isConnected = val;
  if (val) {
    console.log('✅ PostgreSQL Database connected successfully');
  }
};

pool.on('connect', () => { 
  if (!_isConnected) setConnected(true); 
});

pool.on('error', () => { 
  _isConnected = false; 
  console.error('❌ Database connection error');
});

// Export a promise that resolves when connection is confirmed
const connectionReady = pool.query('SELECT 1')
  .then(() => { setConnected(true); return true; })
  .catch((err) => {
    setConnected(false);
    console.error('❌ Database connection failed:', err.message);
    return false;
  });

const syncConnectionState = async () => {
  try {
    await pool.query('SELECT 1');
    setConnected(true);
  } catch (_) {
    _isConnected = false;
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  isConnected: () => _isConnected,
  syncConnectionState,
  connectionReady,  // Promise that resolves when DB is confirmed connected
};

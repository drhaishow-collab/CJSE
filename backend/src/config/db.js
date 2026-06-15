const { Pool } = require('pg');
require('dotenv').config();

const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || (isVercel ? '2406:da12:1f1:f802:8e85:29f7:b77b:9aeb' : 'localhost'),
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

let _lastError = null;
let _currentHost = pool.options.host;

const ensureDbConnectionState = async () => {
  try {
    const client = await pool.connect();
    client.release();
    _isConnected = true;
    _lastError = null;
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    _isConnected = false;
    _lastError = error.message;
    return false;
  }
};

const getDbStatus = () => {
  return { isConnected: _isConnected, lastError: _lastError, host: _currentHost };
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  ensureDbConnectionState,
  getDbStatus,
};

const { Client } = require('pg');

async function createIndexes() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });

  try {
    await client.connect();
    console.log('✅ Connected to sales_db');

    console.log('Creating index on sellout(ma_kh, ngay_dat_hang DESC, ma_nv)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sellout_cust_date ON sellout (ma_kh, ngay_dat_hang DESC, ma_nv);');

    console.log('Creating index on customer(ma_khach_hang)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_customer_code ON customer (ma_khach_hang);');

    console.log('✅ Indexes created successfully!');
  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
  } finally {
    await client.end();
  }
}

createIndexes();

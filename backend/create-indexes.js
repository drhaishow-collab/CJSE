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

    console.log('Creating index on sellout(nam, thang)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sellout_period ON sellout (nam, thang);');

    console.log('Creating index on sellout(ma_nv)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sellout_ma_nv ON sellout (ma_nv);');

    console.log('Creating index on sellout(ma_kh)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sellout_ma_kh ON sellout (ma_kh);');

    console.log('Creating index on visit(ngay)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_visit_ngay ON visit (ngay);');

    console.log('Creating index on visit(ma_nv)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_visit_ma_nv ON visit (ma_nv);');

    console.log('Creating index on customer(ma_khach_hang)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_customer_makh ON customer (ma_khach_hang);');

    console.log('Creating index on kpitonghop(ma_nhan_vien)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kpitonghop_staff ON kpitonghop (ma_nhan_vien);');

    console.log('Creating index on saleteam(ma_nv)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_saleteam_nv ON saleteam (ma_nv);');

    console.log('Creating index on saleteam(ma_gsbh)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_saleteam_gsbh ON saleteam (ma_gsbh);');

    console.log('Creating index on saleteam(ma_quan_ly_vung)...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_saleteam_ql ON saleteam (ma_quan_ly_vung);');

    console.log('✅ Indexes created successfully!');
  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
  } finally {
    await client.end();
  }
}

createIndexes();

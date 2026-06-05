const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '123456';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const targetDatabase = 'sup';

async function initializeDatabase() {
  console.log('🔄 Bắt đầu quá trình khởi tạo cơ sở dữ liệu...');

  // 1. Connect to default 'postgres' database first to create target database
  const clientDefault = new Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: 'postgres', // default DB
  });

  try {
    await clientDefault.connect();
    console.log('🔌 Đã kết nối với PostgreSQL local (db: postgres)');

    // Check if target database exists
    const checkDbResult = await clientDefault.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDatabase]
    );

    if (checkDbResult.rowCount === 0) {
      console.log(`🔨 Đang tạo mới cơ sở dữ liệu "${targetDatabase}"...`);
      // CREATE DATABASE cannot run inside a transaction block, pg client does not use transaction by default for single queries
      await clientDefault.query(`CREATE DATABASE ${targetDatabase}`);
      console.log(`✅ Đã tạo cơ sở dữ liệu "${targetDatabase}" thành công.`);
    } else {
      console.log(`ℹ️ Cơ sở dữ liệu "${targetDatabase}" đã tồn tại.`);
    }
  } catch (err) {
    console.error('❌ Lỗi khi kiểm tra/tạo cơ sở dữ liệu:', err.message);
    process.exit(1);
  } finally {
    await clientDefault.end();
  }

  // 2. Connect to the newly created 'sup' database to run schema and seed
  const clientTarget = new Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: targetDatabase,
  });

  try {
    await clientTarget.connect();
    console.log(`🔌 Đã kết nối thành công với cơ sở dữ liệu "${targetDatabase}"`);

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
    console.log(`📖 Đang đọc file schema từ: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await clientTarget.query(schemaSql);
    console.log('✅ Đã khởi tạo cấu trúc bảng (schema.sql) thành công.');

    // Read and execute seed.sql
    const seedPath = path.join(__dirname, '..', '..', 'seed.sql');
    console.log(`📖 Đang đọc file dữ liệu mẫu từ: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await clientTarget.query(seedSql);
    console.log('✅ Đã nạp dữ liệu mẫu (seed.sql) thành công.');

    console.log('🎉 KHỞI TẠO CƠ SỞ DỮ LIỆU HOÀN TẤT THÀNH CÔNG!');
  } catch (err) {
    console.error('❌ Lỗi khi tạo bảng hoặc nạp dữ liệu mẫu:', err.message);
    process.exit(1);
  } finally {
    await clientTarget.end();
  }
}

initializeDatabase();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
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

    // 1. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    console.log('✅ schema.sql executed successfully!');

    // 2. Read and execute seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    console.log(`Reading seed data from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('Executing seed.sql...');
    await client.query(seedSql);
    console.log('✅ seed.sql executed successfully!');

  } catch (err) {
    console.error('❌ Error executing SQL files:', err);
  } finally {
    await client.end();
  }
}

run();

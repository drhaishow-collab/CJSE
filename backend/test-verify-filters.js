const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing Backend API Reports Endpoints with Filters...\n');
  const base = 'http://127.0.0.1:3001/api/reports';

  try {
    // 1. Test /product with different periods
    console.log('--- 1. Testing Product Report ---');
    const prodMay2026 = await fetchJson(`${base}/product?year=2026&month=5`);
    const prodApr2026 = await fetchJson(`${base}/product?year=2026&month=4`);
    const prodAll = await fetchJson(`${base}/product`);

    console.log(`May 2026 Product: totalSales = ${prodMay2026.summary.totalSales}, totalQty = ${prodMay2026.summary.totalQty}, SKUs = ${prodMay2026.hierarchicalData.length}`);
    console.log(`Apr 2026 Product: totalSales = ${prodApr2026.summary.totalSales}, totalQty = ${prodApr2026.summary.totalQty}, SKUs = ${prodApr2026.hierarchicalData.length}`);
    console.log(`All-time Product: totalSales = ${prodAll.summary.totalSales}, totalQty = ${prodAll.summary.totalQty}, SKUs = ${prodAll.hierarchicalData.length}`);

    if (prodMay2026.summary.totalSales !== prodApr2026.summary.totalSales && prodMay2026.summary.totalSales !== 0) {
      console.log('✅ PASS: Product report values are filtered correctly by year and month!');
    } else {
      console.log('❌ FAIL: Product report values did not change between periods.');
    }

    // 2. Test /sf-performance with different periods
    console.log('\n--- 2. Testing SF Performance Report ---');
    const sfMay2026 = await fetchJson(`${base}/sf-performance?year=2026&month=5`);
    const sfApr2026 = await fetchJson(`${base}/sf-performance?year=2026&month=4`);

    console.log(`May 2026 SF: totalSales = ${sfMay2026.summary.totalSales}, active reps = ${sfMay2026.leaderboard.length}`);
    console.log(`Apr 2026 SF: totalSales = ${sfApr2026.summary.totalSales}, active reps = ${sfApr2026.leaderboard.length}`);

    if (sfMay2026.summary.totalSales !== sfApr2026.summary.totalSales && sfMay2026.summary.totalSales !== 0) {
      console.log('✅ PASS: SF performance values are filtered correctly by year and month!');
    } else {
      console.log('❌ FAIL: SF performance values did not change between periods.');
    }

    // 3. Test /biz with different periods
    console.log('\n--- 3. Testing Business Review (BIZ) Report & dynamic KPIs ---');
    const bizMay2026 = await fetchJson(`${base}/biz?year=2026&month=5`);
    const bizApr2026 = await fetchJson(`${base}/biz?year=2026&month=4`);

    console.log(`May 2026 Biz KPIs: ASO = ${bizMay2026.kpis.aso}, VPO = ${bizMay2026.kpis.vpo}%, SKU/Order = ${bizMay2026.kpis.sku_order}`);
    console.log(`Apr 2026 Biz KPIs: ASO = ${bizApr2026.kpis.aso}, VPO = ${bizApr2026.kpis.vpo}%, SKU/Order = ${bizApr2026.kpis.sku_order}`);

    if (bizMay2026.kpis.aso !== bizApr2026.kpis.aso) {
      console.log('✅ PASS: Biz KPI values are dynamically calculated and filtered in PostgreSQL!');
    } else {
      console.log('❌ FAIL: Biz KPI values did not change between periods.');
    }

  } catch (error) {
    console.error('❌ Error executing API tests:', error.message);
  }
}

run();

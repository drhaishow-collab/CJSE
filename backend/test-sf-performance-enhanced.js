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
  console.log('Testing SF Performance Endpoint...');
  const url = 'http://localhost:3001/api/reports/sf-performance?year=2026&month=5';
  
  console.time('sf-performance-api-call');
  try {
    const res = await fetchJson(url);
    console.timeEnd('sf-performance-api-call');
    
    console.log('\nResponse Keys:', Object.keys(res));
    console.log('productSales length:', res.productSales?.length);
    console.log('kpiSales length:', res.kpiSales?.length);
    console.log('repsData length:', res.repsData?.length);
    
    if (res.repsData && res.repsData.length > 0) {
      console.log('\nSample Rep Data:');
      console.log(res.repsData[0]);
    }
  } catch (error) {
    console.error('❌ Error executing API test:', error.message);
  }
}

run();

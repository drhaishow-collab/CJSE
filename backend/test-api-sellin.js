const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    const status = await get('http://localhost:3001/api/status');
    console.log('STATUS:', status.body);

    const biz = await get('http://localhost:3001/api/reports/biz?userRole=admin&year=2026&month=2');
    const data = JSON.parse(biz.body);
    const sellin = (data.rawData || []).filter((r) => String(r.type).toLowerCase() === 'sellin');
    const sellout = (data.rawData || []).filter((r) => String(r.type).toLowerCase() === 'sellout');
    console.log('BIZ rawData rows:', data.rawData?.length, 'sellin:', sellin.length, 'sellout:', sellout.length);
    const sellinSales = sellin.reduce((s, r) => s + (r.sales || 0), 0);
    const selloutSales = sellout.reduce((s, r) => s + (r.sales || 0), 0);
    console.log('Sellin total sales:', sellinSales, 'Sellout total sales:', selloutSales);
    console.log('Sample sellin regions:', [...new Set(sellin.map((r) => r.region))].slice(0, 8));
  } catch (e) {
    console.error('API not reachable:', e.message);
  }
})();

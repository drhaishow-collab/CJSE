const http = require('http');

http.get('http://localhost:3001/api/reports/biz?userRole=admin&year=2026&month=2', (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    const j = JSON.parse(data);
    const sellin = (j.rawData || []).filter((r) => String(r.type).toLowerCase() === 'sellin');
    console.log('First 3 sellin rows:', JSON.stringify(sellin.slice(0, 3), null, 2));
    const withSales = sellin.filter((r) => r.sales > 0);
    console.log('Sellin rows with sales>0:', withSales.length, '/', sellin.length);

    const prod = require('http');
    prod.get('http://localhost:3001/api/reports/product?userRole=admin&year=2026&month=2', (res2) => {
      let d2 = '';
      res2.on('data', (c) => (d2 += c));
      res2.on('end', () => {
        const p = JSON.parse(d2);
        console.log('Product summary:', p.summary);
        console.log('Product detail sellin:', p.detailData?.detailSummary);
      });
    });
  });
});

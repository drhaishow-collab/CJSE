const http = require('http');

http.get('http://localhost:3001/api/reports/product', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ API reports/product response summary:', parsed.summary);
      console.log('Top products count:', parsed.topProducts.length);
      console.log('Sample top products:', parsed.topProducts.slice(0, 3));
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('API request failed:', err.message);
});

const http = require('http');

const endpoints = ['/api/dashboard', '/api/stores', '/api/visits'];

endpoints.forEach(ep => {
  http.get(`http://localhost:3001${ep}`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`\n--- Endpoint: ${ep} (Status: ${res.statusCode}) ---`);
      try {
        console.log(JSON.parse(data));
      } catch (e) {
        console.log(data);
      }
    });
  }).on('error', (err) => {
    console.error(`Request to ${ep} failed:`, err.message);
  });
});

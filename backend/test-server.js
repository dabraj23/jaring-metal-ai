console.log('Starting test...');

try {
  const { db, initializeSchema } = require('./database/db');
  console.log('Database module loaded');

  initializeSchema();
  console.log('Schema initialized');

  const express = require('express');
  const app = express();
  const PORT = 3000;

  app.get('/test', (req, res) => {
    res.json({ status: 'ok' });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server running on port ${PORT}`);

    setTimeout(() => {
      console.log('Test complete, closing server');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    }, 2000);
  });
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

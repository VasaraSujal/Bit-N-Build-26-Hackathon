require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`ClubOps AI API running on port ${PORT}`);
});

// Graceful shutdown handling
const handleGracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] HTTP server closed.');

    try {
      await pool.end();
      console.log('[Database] PostgreSQL connection pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('[Database] Error closing PostgreSQL pool:', err.message);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if shutdown hangs
  setTimeout(() => {
    console.error('[Server] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[Database] WARNING: DATABASE_URL is not defined in environment variables.');
}

// Configure PostgreSQL connection pool
// Neon and Supabase require SSL connections
const isProductionOrCloud = connectionString && (
  connectionString.includes('neon.tech') ||
  connectionString.includes('supabase.co') ||
  connectionString.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production'
);

const poolConfig = {
  connectionString: connectionString || undefined,
};

if (isProductionOrCloud) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};

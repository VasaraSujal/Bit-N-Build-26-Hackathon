const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runSeeds() {
  const client = await pool.connect();
  try {
    console.log('[Seed] Connected to PostgreSQL database.');

    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`[Seed] Executing: ${file}...`);
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`[Seed] Completed: ${file}`);
    }

    console.log('[Seed] All seed files executed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Seed error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds();

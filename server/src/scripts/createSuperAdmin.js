require('dotenv').config();
const { pool } = require('../config/database');
const { hashPassword } = require('../utils/auth');

async function createSuperAdmin() {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error('[Bootstrap Error] Missing required environment variables.');
    console.error('Please provide SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD.');
    console.error('Example: SUPER_ADMIN_NAME="Admin" SUPER_ADMIN_EMAIL="admin@clubops.ai" SUPER_ADMIN_PASSWORD="securepassword" npm run create:superadmin');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const client = await pool.connect();
  try {
    // Check if user already exists
    const existing = await client.query(
      'SELECT id, role FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      console.log(`[Bootstrap] User with email ${normalizedEmail} already exists (Role: ${existing.rows[0].role}).`);
      process.exit(0);
    }

    const hashedPassword = await hashPassword(password);

    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, club_id, is_active)
       VALUES ($1, $2, $3, 'SUPER_ADMIN', NULL, TRUE)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, hashedPassword]
    );

    const created = result.rows[0];
    console.log('[Bootstrap] SUPER_ADMIN created successfully:');
    console.log({
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      created_at: created.created_at
    });
  } catch (err) {
    console.error('[Bootstrap Error] Failed to create SUPER_ADMIN:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createSuperAdmin();

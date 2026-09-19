const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function seedDemoAccounts() {
  try {
    const hash = await bcrypt.hash('Test@12345', 10);
    const clubId = 'c1111111-1111-1111-1111-111111111111';

    // 1. Super Admin
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, club_id, is_active)
      VALUES ($1, $2, $3, 'SUPER_ADMIN', NULL, TRUE)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, role = 'SUPER_ADMIN', is_active = TRUE
    `, ['Super Admin', 'superadmin@clubops.ai', hash]);

    // 2. Club Admin
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, club_id, is_active)
      VALUES ($1, $2, $3, 'CLUB_ADMIN', $4, TRUE)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, role = 'CLUB_ADMIN', club_id = $4, is_active = TRUE
    `, ['Sujal Vasara', 'clubadmin@example.com', hash, clubId]);

    // 3. Volunteer
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, club_id, is_active)
      VALUES ($1, $2, $3, 'VOLUNTEER', $4, TRUE)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, role = 'VOLUNTEER', club_id = $4, is_active = TRUE
    `, ['Riya Sharma', 'volunteer@example.com', hash, clubId]);

    console.log('DEMO ACCOUNTS SEEDED SUCCESSFULLY ON SUPABASE POSTGRESQL!');
  } catch (err) {
    console.error('Error seeding demo accounts:', err.message);
  } finally {
    await pool.end();
  }
}

seedDemoAccounts();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt.
 * @param {string} password 
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plaintext password with a hashed password.
 * @param {string} password 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a signed JWT token containing the given payload.
 * Payload should contain: { userId, role, clubId }
 * @param {object} payload 
 * @returns {string}
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify a signed JWT token.
 * @param {string} token 
 * @returns {object}
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.verify(token, secret);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};

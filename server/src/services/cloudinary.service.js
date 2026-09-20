require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

/**
 * Helper to get clean environment variable value
 */
const getEnv = (key) => {
  const val = process.env[key];
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^['"]|['"]$/g, '');
};

/**
 * Configure and return Cloudinary instance with latest environment variables
 */
const getCloudinaryInstance = () => {
  const cloudName = getEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = getEnv('CLOUDINARY_API_KEY');
  const apiSecret = getEnv('CLOUDINARY_API_SECRET');

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  return cloudinary;
};

/**
 * Checks if Cloudinary is properly configured with environment variables
 */
const isCloudinaryConfigured = () => {
  const cloudName = getEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = getEnv('CLOUDINARY_API_KEY');
  const apiSecret = getEnv('CLOUDINARY_API_SECRET');

  return Boolean(cloudName && apiKey && apiSecret);
};

/**
 * Uploads a club logo buffer to Cloudinary in the 'clubops/clubs' folder
 * with a unique public ID.
 *
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} originalname - Original file name for logging / sanitization
 * @returns {Promise<{ secureUrl: string, publicId: string }>}
 */
const uploadClubLogo = async (buffer, originalname = '') => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const bufferErr = new Error('Invalid image buffer provided for upload.');
    bufferErr.status = 400;
    throw bufferErr;
  }

  if (!isCloudinaryConfigured()) {
    console.error('[Cloudinary Service] Cloudinary credentials are missing or empty in server environment.');
    const configError = new Error('Unable to upload the club logo. Please ensure Cloudinary credentials are configured on the backend.');
    configError.status = 500;
    throw configError;
  }

  const cld = getCloudinaryInstance();
  const uniqueId = `club_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder: 'clubops/clubs',
        public_id: uniqueId,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Service] Upload failed:', error.message || error);
          const uploadError = new Error('Unable to upload the club logo. Please try again.');
          uploadError.status = 500;
          return reject(uploadError);
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes an uploaded asset from Cloudinary (used for rollback / cleanup)
 *
 * @param {string} publicId - Cloudinary public ID
 */
const deleteClubLogo = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    const cld = getCloudinaryInstance();
    await cld.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('[Cloudinary Service] Asset cleanup failed for publicId:', publicId, error.message || error);
  }
};

module.exports = {
  uploadClubLogo,
  deleteClubLogo,
  isCloudinaryConfigured
};

const multer = require('multer');
const path = require('path');

// Allowed image MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Configure memory storage
const storage = multer.memoryStorage();

// File filter to validate image type strictly
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

  if (isValidMime && isValidExt) {
    return cb(null, true);
  }

  const err = new Error('Please select a JPG, PNG, or WebP image.');
  err.code = 'INVALID_FILE_TYPE';
  err.status = 400;
  return cb(err, false);
};

// Multer upload instance configured for max 5MB
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter
});

/**
 * Middleware wrapper for single club logo upload ('logo' field)
 * Handles Multer errors with clear client-facing messages and appropriate HTTP status codes.
 */
const uploadClubLogoMiddleware = (req, res, next) => {
  const singleUpload = upload.single('logo');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'Image size must be less than 5 MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error.'
        });
      }

      if (err.code === 'INVALID_FILE_TYPE' || err.status === 400) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Please select a JPG, PNG, or WebP image.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during file upload.'
      });
    }

    next();
  });
};

module.exports = {
  uploadClubLogoMiddleware
};

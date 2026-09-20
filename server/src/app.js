require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/database');

const authRoutes = require('./routes/auth.routes');
const clubRoutes = require('./routes/club.routes');
const eventRoutes = require('./routes/event.routes');
const aiRoutes = require('./routes/ai.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ClubOps AI API is running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/api/health', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      success: false,
      message: 'ClubOps AI API is unhealthy',
      database: 'disconnected'
    });
  }

  try {
    // Run a lightweight test query on PostgreSQL
    await pool.query('SELECT 1');

    return res.status(200).json({
      success: true,
      message: 'ClubOps AI API is healthy',
      database: 'connected'
    });
  } catch (error) {
    // Log error internally without exposing credentials/internal stack trace to client
    console.error('[Health Check] Database connection check failed:', error.message);

    return res.status(503).json({
      success: false,
      message: 'ClubOps AI API is unhealthy',
      database: 'disconnected'
    });
  }
});

// Minimal 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Minimal global error handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.message || err);
  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;

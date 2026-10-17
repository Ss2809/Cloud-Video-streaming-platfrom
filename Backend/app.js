require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const historyRoutes = require('./routes/historyRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Initialize database connection
connectDB();

const app = express();

// Global Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'ETag'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base / Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    platform: 'StreamCloud Video Streaming Platform',
    status: 'API operational',
    version: '1.0.0',
    authFlow: 'Passwordless 6-digit OTP (Register/Login)',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[StreamCloud Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
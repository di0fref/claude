require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const { scheduleWarmPredictionUpdates, scheduleOverdueBaleNotifications } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const SOCKET_PATH = process.env.SOCKET_PATH || null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/bales', require('./routes/bales'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Sync database and start server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models (in production, use migrations instead)
    await sequelize.sync();
    console.log('Database synchronized.');

    // Initialize scheduled tasks
    scheduleWarmPredictionUpdates();
    scheduleOverdueBaleNotifications();

    // Listen on Unix socket if specified, otherwise TCP port
    if (SOCKET_PATH) {
      // Remove old socket if it exists
      const fs = require('fs');
      if (fs.existsSync(SOCKET_PATH)) {
        fs.unlinkSync(SOCKET_PATH);
      }

      app.listen(SOCKET_PATH, () => {
        // Make socket accessible to Apache user
        fs.chmodSync(SOCKET_PATH, '0666');
        console.log(`Server is running on Unix socket: ${SOCKET_PATH}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
      });
    } else {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
      });
    }
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

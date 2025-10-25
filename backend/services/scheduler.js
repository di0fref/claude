const cron = require('node-cron');
const { Bale, Setting } = require('../models');
const smhiService = require('./smhiService');
const emailService = require('./emailService');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const cronLogFile = path.join(logsDir, 'cron.log');

// Helper function to write to cron log
const logCron = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message); // Still log to console
  try {
    fs.appendFileSync(cronLogFile, logMessage);
  } catch (error) {
    console.error('Failed to write to cron log:', error.message);
  }
};

// Run every day at 6 AM to update warm predictions
const scheduleWarmPredictionUpdates = () => {
  cron.schedule('0 6 * * *', async () => {
    logCron('Running scheduled warm prediction update...');

    try {
      // Get SMHI location from settings
      const settings = await Setting.findAll();
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      const lat = parseFloat(settingsObj.smhi_latitude || 59.3293);
      const lon = parseFloat(settingsObj.smhi_longitude || 18.0686);

      // Get open bales without warm date
      const openBales = await Bale.findAll({
        where: {
          isOpen: true,
          isClosed: false,
          openedDate: { [require('sequelize').Op.ne]: null },
          warmDate: null
        }
      });

      // Get historical bales for prediction
      const historicalBales = await Bale.findAll({
        where: {
          warmDate: { [require('sequelize').Op.ne]: null },
          warmTemperature: { [require('sequelize').Op.ne]: null }
        }
      });

      let updated = 0;
      for (const bale of openBales) {
        try {
          const prediction = await smhiService.predictWarmDate(
            bale.openedDate,
            historicalBales,
            lat,
            lon
          );

          if (prediction && prediction.predictedDate) {
            bale.predictedWarmDate = prediction.predictedDate;
            await bale.save();
            updated++;
          }
        } catch (error) {
          logCron(`Error predicting for bale ${bale.id}: ${error.message}`);
        }
      }

      logCron(`Warm prediction update complete: ${updated}/${openBales.length} bales updated`);
    } catch (error) {
      logCron(`Error in scheduled warm prediction update: ${error.message}`);
    }
  });

  logCron('Warm prediction scheduler initialized (runs daily at 6 AM)');
};

// Run every day at 8 AM to check for overdue bales and send email notifications
const scheduleOverdueBaleNotifications = () => {
  cron.schedule('0 8 * * *', async () => {
    logCron('Running scheduled overdue bale check...');
    try {
      const result = await emailService.checkAndNotifyOverdueBales();
      logCron(`Overdue bale check complete: ${result || 'completed'}`);
    } catch (error) {
      logCron(`Error in scheduled overdue bale notification: ${error.message}`);
    }
  });

  logCron('Overdue bale notification scheduler initialized (runs daily at 8 AM)');
};

module.exports = {
  scheduleWarmPredictionUpdates,
  scheduleOverdueBaleNotifications
};

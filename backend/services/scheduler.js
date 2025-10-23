const cron = require('node-cron');
const { Bale, Setting } = require('../models');
const smhiService = require('./smhiService');
const emailService = require('./emailService');

// Run every day at 6 AM to update warm predictions
const scheduleWarmPredictionUpdates = () => {
  cron.schedule('0 6 * * *', async () => {
    console.log('Running scheduled warm prediction update...');

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
          console.error(`Error predicting for bale ${bale.id}:`, error.message);
        }
      }

      console.log(`Warm prediction update complete: ${updated}/${openBales.length} bales updated`);
    } catch (error) {
      console.error('Error in scheduled warm prediction update:', error);
    }
  });

  console.log('Warm prediction scheduler initialized (runs daily at 6 AM)');
};

// Run every day at 8 AM to check for overdue bales and send email notifications
const scheduleOverdueBaleNotifications = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('Running scheduled overdue bale check...');
    try {
      await emailService.checkAndNotifyOverdueBales();
    } catch (error) {
      console.error('Error in scheduled overdue bale notification:', error);
    }
  });

  console.log('Overdue bale notification scheduler initialized (runs daily at 8 AM)');
};

module.exports = {
  scheduleWarmPredictionUpdates,
  scheduleOverdueBaleNotifications
};

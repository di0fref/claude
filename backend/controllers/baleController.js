const { Bale, Delivery, Setting } = require('../models');
const smhiService = require('../services/smhiService');

// Helper function to get today's date without time (YYYY-MM-DD)
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

exports.getBalesByDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const bales = await Bale.findAll({
      where: { deliveryId },
      include: [{
        model: Delivery,
        as: 'delivery',
        attributes: ['id', 'supplier', 'deliveryDate']
      }]
    });

    res.json(bales);
  } catch (error) {
    console.error('Get bales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllBales = async (req, res) => {
  try {
    const bales = await Bale.findAll({
      include: [{
        model: Delivery,
        as: 'delivery',
        attributes: ['id', 'supplier', 'deliveryDate']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(bales);
  } catch (error) {
    console.error('Get all bales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateBaleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOpen, isClosed, isReimbursed, isBad } = req.body;

    const bale = await Bale.findByPk(id);
    if (!bale) {
      return res.status(404).json({ error: 'Bale not found' });
    }

    // Validation: cannot be open and closed at the same time
    const wouldBeOpen = isOpen !== undefined ? isOpen : bale.isOpen;
    const wouldBeClosed = isClosed !== undefined ? isClosed : bale.isClosed;

    if (wouldBeOpen && wouldBeClosed) {
      return res.status(400).json({ error: 'A bale cannot be open and closed at the same time' });
    }

    // Update status fields
    if (isOpen !== undefined) {
      bale.isOpen = isOpen;
      // Set opened date when marking as open
      if (isOpen && !bale.openedDate) {
        bale.openedDate = getTodayDate();
      }
    }

    if (isClosed !== undefined) {
      bale.isClosed = isClosed;
      // Set closed date when marking as closed
      if (isClosed && !bale.closedDate) {
        bale.closedDate = getTodayDate();
      }
    }

    if (isReimbursed !== undefined) {
      bale.isReimbursed = isReimbursed;
    }

    if (isBad !== undefined) {
      bale.isBad = isBad;
    }

    await bale.save();
    res.json(bale);
  } catch (error) {
    console.error('Update bale status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateBaleDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { openedDate, closedDate, warmDate } = req.body;

    const bale = await Bale.findByPk(id);
    if (!bale) {
      return res.status(404).json({ error: 'Bale not found' });
    }

    if (openedDate !== undefined) {
      bale.openedDate = openedDate || null;
    }

    if (closedDate !== undefined) {
      bale.closedDate = closedDate || null;
    }

    if (warmDate !== undefined) {
      bale.warmDate = warmDate || null;

      // If setting a warm date, fetch and record current temperature from SMHI
      if (warmDate && !bale.warmTemperature) {
        // Get SMHI location from settings
        const settings = await Setting.findAll();
        const settingsObj = {};
        settings.forEach(setting => {
          settingsObj[setting.key] = setting.value;
        });

        const lat = parseFloat(settingsObj.smhi_latitude || 59.3293);
        const lon = parseFloat(settingsObj.smhi_longitude || 18.0686);

        const temperature = await smhiService.getCurrentTemperature(lat, lon);
        if (temperature !== null) {
          bale.warmTemperature = temperature;
        }
      }
    }

    await bale.save();
    res.json(bale);
  } catch (error) {
    console.error('Update bale dates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      winterWarningDays,
      summerWarningDays,
      smhiLatitude,
      smhiLongitude,
      emailSmtpHost,
      emailSmtpPort,
      emailSmtpUser,
      emailSmtpPassword,
      emailNotificationTo,
      emailEnabled
    } = req.body;

    const settingsMap = {
      winterWarningDays: 'winter_warning_days',
      summerWarningDays: 'summer_warning_days',
      smhiLatitude: 'smhi_latitude',
      smhiLongitude: 'smhi_longitude',
      emailSmtpHost: 'email_smtp_host',
      emailSmtpPort: 'email_smtp_port',
      emailSmtpUser: 'email_smtp_user',
      emailSmtpPassword: 'email_smtp_password',
      emailNotificationTo: 'email_to',
      emailEnabled: 'email_notifications_enabled'
    };

    for (const [paramName, dbKey] of Object.entries(settingsMap)) {
      const value = req.body[paramName];
      if (value !== undefined) {
        await Setting.update(
          { value: value === null || value === '' ? '' : value.toString() },
          { where: { key: dbKey } }
        );
      }
    }

    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.predictWarmDate = async (req, res) => {
  try {
    const { id } = req.params;

    const bale = await Bale.findByPk(id);
    if (!bale) {
      return res.status(404).json({ error: 'Bale not found' });
    }

    if (!bale.openedDate) {
      return res.status(400).json({ error: 'Bale must have an opened date for prediction' });
    }

    // Get SMHI location from settings
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    const lat = parseFloat(settingsObj.smhi_latitude || 59.3293);
    const lon = parseFloat(settingsObj.smhi_longitude || 18.0686);

    // Get historical bales that became warm
    const historicalBales = await Bale.findAll({
      where: {
        warmDate: { [require('sequelize').Op.ne]: null },
        warmTemperature: { [require('sequelize').Op.ne]: null }
      }
    });

    // Get prediction from SMHI service
    const prediction = await smhiService.predictWarmDate(
      bale.openedDate,
      historicalBales,
      lat,
      lon
    );

    // Save prediction to database
    if (prediction && prediction.predictedDate) {
      bale.predictedWarmDate = prediction.predictedDate;
      await bale.save();
    }

    res.json({
      baleId: bale.id,
      openedDate: bale.openedDate,
      prediction,
      predictedWarmDate: bale.predictedWarmDate
    });
  } catch (error) {
    console.error('Predict warm date error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update predictions for all open bales
exports.updateAllPredictions = async (req, res) => {
  try {
    // Get SMHI location from settings
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    const lat = parseFloat(settingsObj.smhi_latitude || 59.3293);
    const lon = parseFloat(settingsObj.smhi_longitude || 18.0686);

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

    res.json({
      message: `Updated predictions for ${updated} bales`,
      totalBales: openBales.length,
      updated
    });
  } catch (error) {
    console.error('Update all predictions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

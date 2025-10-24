const nodemailer = require('nodemailer');
const { Bale, Setting, Delivery } = require('../models');

/**
 * Create email transporter from settings
 */
async function createTransporter() {
  const settings = await Setting.findAll();
  const settingsObj = {};
  settings.forEach(setting => {
    settingsObj[setting.key] = setting.value;
  });

  if (!settingsObj.email_smtp_host || !settingsObj.email_smtp_user) {
    return null;
  }

  return nodemailer.createTransport({
    host: settingsObj.email_smtp_host,
    port: parseInt(settingsObj.email_smtp_port || 587),
    secure: false, // true for 465, false for other ports
    auth: {
      user: settingsObj.email_smtp_user,
      pass: settingsObj.email_smtp_password
    }
  });
}

/**
 * Check for overdue bales and send email notifications
 */
async function checkAndNotifyOverdueBales() {
  try {
    // Get settings
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    // Check if email notifications are enabled
    if (settingsObj.email_notifications_enabled !== 'true') {
      console.log('Email notifications are disabled');
      return;
    }

    if (!settingsObj.email_to) {
      console.log('No notification email configured');
      return;
    }

    const winterThreshold = parseInt(settingsObj.winter_warning_days || 7);
    const summerThreshold = parseInt(settingsObj.summer_warning_days || 5);

    // Determine current season (simple: Oct-Mar = winter, Apr-Sep = summer)
    const currentMonth = new Date().getMonth() + 1;
    const isWinter = currentMonth >= 10 || currentMonth <= 3;
    const threshold = isWinter ? winterThreshold : summerThreshold;

    // Get open bales that have been open too long
    const openBales = await Bale.findAll({
      where: {
        isOpen: true,
        isClosed: false,
        openedDate: { [require('sequelize').Op.ne]: null }
      },
      include: [{
        model: Delivery,
        as: 'delivery',
        attributes: ['id', 'supplier', 'deliveryDate']
      }]
    });

    const overdueBales = openBales.filter(bale => {
      const openedDate = new Date(bale.openedDate);
      const today = new Date();
      const daysOpen = Math.floor((today - openedDate) / (1000 * 60 * 60 * 24));
      return daysOpen >= threshold;
    });

    if (overdueBales.length === 0) {
      console.log('No overdue bales found');
      return;
    }

    // Create transporter
    const transporter = await createTransporter();
    if (!transporter) {
      console.log('Email transporter not configured');
      return;
    }

    // Build email content
    const season = isWinter ? 'winter' : 'summer';
    let emailBody = `You have ${overdueBales.length} bale(s) that have been open for too long (${season} threshold: ${threshold} days):\n\n`;

    overdueBales.forEach(bale => {
      const openedDate = new Date(bale.openedDate);
      const today = new Date();
      const daysOpen = Math.floor((today - openedDate) / (1000 * 60 * 60 * 24));

      emailBody += `- Bale #${bale.id} from ${bale.delivery?.supplier || 'Unknown'}\n`;
      emailBody += `  Opened: ${bale.openedDate}\n`;
      emailBody += `  Days open: ${daysOpen} days\n`;
      if (bale.predictedWarmDate) {
        emailBody += `  Predicted warm date: ${bale.predictedWarmDate}\n`;
      }
      emailBody += `\n`;
    });

    emailBody += `\nPlease check these bales to prevent spoilage.\n\nThis is an automated message from the Bale Tracking System.`;

    // Send email
    await transporter.sendMail({
      from: settingsObj.email_smtp_user,
      to: settingsObj.email_to,
      subject: `⚠️ Alert: ${overdueBales.length} Overdue Bale(s)`,
      text: emailBody
    });

    console.log(`Email notification sent for ${overdueBales.length} overdue bales to ${settingsObj.email_to}`);

  } catch (error) {
    console.error('Error in email notification service:', error);
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(username, resetUrl) {
  try {
    // Get settings
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    // Create transporter
    const transporter = await createTransporter();
    if (!transporter) {
      console.log('Email transporter not configured');
      throw new Error('Email service not configured');
    }

    // Build email content
    const emailBody = `Hello ${username},\n\nYou requested to reset your password.\n\nPlease click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\nThis is an automated message from the Bale Tracking System.`;

    // Send email
    await transporter.sendMail({
      from: settingsObj.email_smtp_user,
      to: settingsObj.email_to,
      subject: 'Password Reset Request',
      text: emailBody
    });

    console.log(`Password reset email sent to ${settingsObj.email_to}`);

  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

module.exports = {
  checkAndNotifyOverdueBales,
  sendPasswordResetEmail
};

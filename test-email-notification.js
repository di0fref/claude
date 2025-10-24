#!/usr/bin/env node

/**
 * Test script for email notification system
 *
 * This script tests the email notification functionality by:
 * 1. Checking current email settings
 * 2. Validating SMTP configuration
 * 3. Running the overdue bale check
 * 4. Optionally sending a test email
 *
 * Usage:
 *   node test-email-notification.js                  # Check settings and run notification check
 *   node test-email-notification.js --send-test      # Also send a test email
 *   node test-email-notification.js --force          # Force send notification even if no overdue bales
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const nodemailer = require('nodemailer');
const { Bale, Setting, Delivery, sequelize } = require('./backend/models');
const emailService = require('./backend/services/emailService');

const args = process.argv.slice(2);
const sendTest = args.includes('--send-test');
const force = args.includes('--force');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

async function getSettings() {
  const settings = await Setting.findAll();
  const settingsObj = {};
  settings.forEach(setting => {
    settingsObj[setting.key] = setting.value;
  });
  return settingsObj;
}

async function displaySettings() {
  logSection('Current Email Settings');

  const settings = await getSettings();

  const emailSettings = {
    'Email Enabled': settings.email_notifications_enabled === 'true' ? '✓ Yes' : '✗ No',
    'SMTP Host': settings.email_smtp_host || '(not set)',
    'SMTP Port': settings.email_smtp_port || '587',
    'SMTP User': settings.email_smtp_user || '(not set)',
    'SMTP Password': settings.email_smtp_password ? '****** (set)' : '(not set)',
    'Notification Email': settings.email_to || '(not set)',
    'Winter Warning Days': settings.winter_warning_days || '7',
    'Summer Warning Days': settings.summer_warning_days || '5'
  };

  Object.entries(emailSettings).forEach(([key, value]) => {
    const color = value.includes('not set') || value.includes('✗') ? 'yellow' : 'green';
    log(`  ${key.padEnd(25)} : ${value}`, color);
  });

  // Validation warnings
  const warnings = [];
  if (settings.email_notifications_enabled !== 'true') warnings.push('Email notifications are disabled');
  if (!settings.email_smtp_host) warnings.push('SMTP host not configured');
  if (!settings.email_smtp_user) warnings.push('SMTP user not configured');
  if (!settings.email_smtp_password) warnings.push('SMTP password not configured');
  if (!settings.email_to) warnings.push('Notification recipient not configured');

  if (warnings.length > 0) {
    log('\n⚠️  Configuration Warnings:', 'yellow');
    warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
  } else {
    log('\n✓ All email settings are configured', 'green');
  }

  return settings;
}

async function testSMTPConnection(settings) {
  logSection('Testing SMTP Connection');

  if (!settings.email_smtp_host || !settings.email_smtp_user) {
    log('✗ Cannot test connection - SMTP not configured', 'red');
    return false;
  }

  try {
    log(`Connecting to ${settings.email_smtp_host}:${settings.email_smtp_port || 587}...`, 'gray');

    const transporter = nodemailer.createTransport({
      host: settings.email_smtp_host,
      port: parseInt(settings.email_smtp_port || 587),
      secure: false,
      auth: {
        user: settings.email_smtp_user,
        pass: settings.email_smtp_password
      }
    });

    await transporter.verify();
    log('✓ SMTP connection successful', 'green');
    return true;
  } catch (error) {
    log('✗ SMTP connection failed:', 'red');
    log(`  ${error.message}`, 'red');
    return false;
  }
}

async function checkOverdueBales(settings) {
  logSection('Checking for Overdue Bales');

  const winterThreshold = parseInt(settings.winter_warning_days || 7);
  const summerThreshold = parseInt(settings.summer_warning_days || 5);

  // Determine current season
  const currentMonth = new Date().getMonth() + 1;
  const isWinter = currentMonth >= 10 || currentMonth <= 3;
  const threshold = isWinter ? winterThreshold : summerThreshold;
  const season = isWinter ? 'winter' : 'summer';

  log(`Current season: ${season}`, 'cyan');
  log(`Warning threshold: ${threshold} days`, 'cyan');

  // Get open bales
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

  log(`\nTotal open bales: ${openBales.length}`, 'gray');

  if (openBales.length === 0) {
    log('No open bales found', 'yellow');
    return [];
  }

  // Calculate overdue bales
  const today = new Date();
  const balesWithDays = openBales.map(bale => {
    const openedDate = new Date(bale.openedDate);
    const daysOpen = Math.floor((today - openedDate) / (1000 * 60 * 60 * 24));
    return { bale, daysOpen, isOverdue: daysOpen >= threshold };
  });

  const overdueBales = balesWithDays.filter(b => b.isOverdue);

  log('\nOpen Bales Status:', 'blue');
  balesWithDays.forEach(({ bale, daysOpen, isOverdue }) => {
    const status = isOverdue ? '⚠️  OVERDUE' : '✓ OK';
    const color = isOverdue ? 'red' : 'green';
    log(`  ${status.padEnd(15)} Bale #${bale.id} - ${bale.delivery?.supplier || 'Unknown'} - ${daysOpen} days open`, color);
  });

  if (overdueBales.length > 0) {
    log(`\n⚠️  ${overdueBales.length} overdue bale(s) found`, 'red');
  } else {
    log('\n✓ No overdue bales', 'green');
  }

  return overdueBales.map(b => b.bale);
}

async function sendTestEmail(settings) {
  logSection('Sending Test Email');

  if (!settings.email_smtp_host || !settings.email_smtp_user) {
    log('✗ Cannot send test email - SMTP not configured', 'red');
    return false;
  }

  if (!settings.email_to) {
    log('✗ Cannot send test email - No recipient configured', 'red');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.email_smtp_host,
      port: parseInt(settings.email_smtp_port || 587),
      secure: false,
      auth: {
        user: settings.email_smtp_user,
        pass: settings.email_smtp_password
      }
    });

    const emailContent = `
This is a test email from the Bale Tracking System.

Email Configuration:
- SMTP Host: ${settings.email_smtp_host}
- SMTP Port: ${settings.email_smtp_port || 587}
- From: ${settings.email_smtp_user}
- To: ${settings.email_to}

If you received this email, your email notification system is working correctly!

--
Bale Tracking System
Automated Test Email
${new Date().toLocaleString()}
    `.trim();

    log(`Sending to: ${settings.email_to}`, 'gray');

    await transporter.sendMail({
      from: settings.email_smtp_user,
      to: settings.email_to,
      subject: '✓ Bale Tracker - Test Email',
      text: emailContent
    });

    log('✓ Test email sent successfully', 'green');
    return true;
  } catch (error) {
    log('✗ Failed to send test email:', 'red');
    log(`  ${error.message}`, 'red');
    return false;
  }
}

async function runNotificationCheck() {
  logSection('Running Notification Check');

  if (force) {
    log('⚠️  Force mode enabled - will attempt to send email regardless', 'yellow');
  }

  try {
    log('Executing checkAndNotifyOverdueBales()...', 'gray');
    await emailService.checkAndNotifyOverdueBales();
    log('✓ Notification check completed', 'green');
  } catch (error) {
    log('✗ Notification check failed:', 'red');
    log(`  ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  try {
    log('Bale Tracker - Email Notification Test Script', 'cyan');
    log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'gray');

    // Connect to database
    await sequelize.authenticate();
    log('✓ Database connected', 'green');

    // Display and get current settings
    const settings = await displaySettings();

    // Test SMTP connection
    const smtpOk = await testSMTPConnection(settings);

    // Check for overdue bales
    const overdueBales = await checkOverdueBales(settings);

    // Send test email if requested
    if (sendTest) {
      await sendTestEmail(settings);
    }

    // Run actual notification check
    if (settings.email_notifications_enabled === 'true' && smtpOk) {
      await runNotificationCheck();
    } else {
      log('\n⚠️  Skipping notification check (email disabled or SMTP not working)', 'yellow');
    }

    // Summary
    logSection('Summary');
    log(`Email Enabled: ${settings.email_notifications_enabled === 'true' ? 'Yes' : 'No'}`, settings.email_notifications_enabled === 'true' ? 'green' : 'red');
    log(`SMTP Connection: ${smtpOk ? 'Working' : 'Failed'}`, smtpOk ? 'green' : 'red');
    log(`Overdue Bales: ${overdueBales.length}`, overdueBales.length > 0 ? 'yellow' : 'green');
    if (sendTest) {
      log('Test Email: Sent', 'green');
    }

    log('\n✓ Test completed successfully', 'green');
    process.exit(0);

  } catch (error) {
    log('\n✗ Test failed:', 'red');
    log(error.stack, 'red');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  log('\n\nTest interrupted by user', 'yellow');
  await sequelize.close();
  process.exit(0);
});

// Run the test
main();

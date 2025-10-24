# Email Notification Test Script

This script tests the email notification system for the Bale Tracker application.

## Prerequisites

- Node.js installed
- Application dependencies installed (`npm install`)
- Database configured and accessible
- Email settings configured in the Settings page

## Usage

### Basic Test (Check Configuration Only)

```bash
node test-email-notification.js
```

This will:
- Display current email settings
- Test SMTP connection
- Check for overdue bales
- Run the notification check (if email is enabled)

### Send Test Email

```bash
node test-email-notification.js --send-test
```

This will do everything above PLUS send a test email to verify email delivery works.

### Force Mode

```bash
node test-email-notification.js --force
```

Forces the notification check to run even if there are no overdue bales (useful for testing).

## Example Output

```
Bale Tracker - Email Notification Test Script
Environment: development
✓ Database connected

============================================================
  Current Email Settings
============================================================
  Email Enabled             : ✓ Yes
  SMTP Host                 : smtp.gmail.com
  SMTP Port                 : 587
  SMTP User                 : your-email@gmail.com
  SMTP Password             : ****** (set)
  Notification Email        : recipient@example.com
  Winter Warning Days       : 7
  Summer Warning Days       : 5

✓ All email settings are configured

============================================================
  Testing SMTP Connection
============================================================
Connecting to smtp.gmail.com:587...
✓ SMTP connection successful

============================================================
  Checking for Overdue Bales
============================================================
Current season: winter
Warning threshold: 7 days

Total open bales: 3

Open Bales Status:
  ✓ OK            Bale #1 - Supplier A - 3 days open
  ⚠️  OVERDUE      Bale #2 - Supplier B - 8 days open
  ✓ OK            Bale #3 - Supplier C - 5 days open

⚠️  1 overdue bale(s) found

============================================================
  Running Notification Check
============================================================
Executing checkAndNotifyOverdueBales()...
✓ Notification check completed

============================================================
  Summary
============================================================
Email Enabled: Yes
SMTP Connection: Working
Overdue Bales: 1

✓ Test completed successfully
```

## Configuring Email Settings

Email settings are configured through the web interface:

1. Log in as admin
2. Go to Settings page
3. Configure the following:
   - **Email Enabled**: Toggle to enable/disable notifications
   - **SMTP Host**: Your email server (e.g., smtp.gmail.com)
   - **SMTP Port**: Usually 587 for TLS or 465 for SSL
   - **SMTP Username**: Your email address
   - **SMTP Password**: Your email password or app-specific password
   - **Notification Email**: Email address to receive alerts
   - **Winter Warning Days**: Days before notification in winter (Oct-Mar)
   - **Summer Warning Days**: Days before notification in summer (Apr-Sep)

## Gmail Configuration Example

If using Gmail:

1. Use `smtp.gmail.com` as host and port `587`
2. Create an [App Password](https://support.google.com/accounts/answer/185833) (required for 2FA accounts)
3. Use your Gmail address as SMTP username
4. Use the App Password as SMTP password

## Common Issues

### "SMTP connection failed: Authentication failed"
- Check username and password are correct
- For Gmail, use an App Password instead of your regular password
- Ensure "Less secure app access" is enabled (if not using 2FA)

### "Cannot send test email - No recipient configured"
- Set the "Notification Email" in Settings

### "Email notifications are disabled"
- Enable email notifications in Settings

### "SMTP connection failed: ECONNREFUSED"
- Check SMTP host and port are correct
- Verify firewall allows outbound connections on the SMTP port

## Testing in Production

To test on production server:

```bash
ssh s6411@ssh.i8t.com
cd /home/s6411/fahlstad.se/claude
node test-email-notification.js --send-test
```

## Scheduled Execution

The email notification system runs automatically via the scheduler:
- **Warm Prediction Updates**: Daily at 6 AM
- **Overdue Bale Notifications**: Daily at 8 AM

To manually trigger the check in production:

```bash
ssh s6411@ssh.i8t.com
cd /home/s6411/fahlstad.se/claude
node -e "require('./backend/services/emailService').checkAndNotifyOverdueBales().then(() => process.exit(0))"
```

## Troubleshooting

### Check Production Logs

```bash
ssh s6411@ssh.i8t.com 'tail -f /home/s6411/fahlstad.se/claude/logs/output.log'
```

Look for lines like:
- `Email notification sent for X overdue bales to...`
- `Email notifications are disabled`
- `No overdue bales found`
- `Error in email notification service:`

### Verify Database Settings

```bash
node -e "
const {Setting} = require('./backend/models');
Setting.findAll().then(settings => {
  settings.forEach(s => {
    if (s.key.startsWith('email')) {
      console.log(s.key + ':', s.key.includes('password') ? '***' : s.value);
    }
  });
  process.exit(0);
});
"
```

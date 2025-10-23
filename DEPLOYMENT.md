# Deployment Guide - Bale Tracker Application

This guide covers deploying the Bale Tracker application to a production server with Apache.

## Prerequisites

- Linux server (Ubuntu/Debian recommended)
- Apache 2.4+
- Node.js 18+ and npm
- SSL certificate (recommended for production)
- Domain name pointed to your server

## Architecture

- **Frontend**: React app built to static files, served by Apache
- **Backend**: Node.js/Express API running on port 5000, managed by PM2
- **Database**: SQLite file-based database
- **Scheduled Tasks**: node-cron running inside Node.js process (6 AM warm predictions, 8 AM email notifications)

---

## Step 1: Prepare Your Server

### 1.1 Install Node.js

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.2 Install Apache

```bash
sudo apt install -y apache2

# Enable required modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod ssl

# Restart Apache
sudo systemctl restart apache2
```

### 1.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Step 2: Upload Application Files

### 2.1 Create Application Directory

```bash
# Create directory
sudo mkdir -p /var/www/bale-tracker
sudo chown -R $USER:$USER /var/www/bale-tracker
cd /var/www/bale-tracker
```

### 2.2 Upload Files

Transfer your application files to the server. You can use:

**Option A: Git (recommended)**
```bash
cd /var/www/bale-tracker
git clone <your-repo-url> .
```

**Option B: SCP/SFTP**
```bash
# From your local machine
scp -r /Users/fref/www/claude/* user@your-server:/var/www/bale-tracker/
```

**Option C: rsync**
```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /Users/fref/www/claude/ user@your-server:/var/www/bale-tracker/
```

---

## Step 3: Configure Backend

### 3.1 Install Backend Dependencies

```bash
cd /var/www/bale-tracker/backend
npm install --production
```

### 3.2 Create Production Environment File

```bash
cd /var/www/bale-tracker/backend
nano .env
```

Add the following (adjust values):

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-very-secure-random-secret-key-change-this-in-production

# Database (SQLite - file path)
DB_STORAGE=./production.sqlite

# CORS (your domain)
FRONTEND_URL=https://yourdomain.com
```

**IMPORTANT**: Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.3 Initialize Production Database

```bash
cd /var/www/bale-tracker/backend
npm run migrate  # If you have migrations

# OR manually create database
node -e "
const { sequelize } = require('./models');
sequelize.sync().then(() => {
  console.log('Database created');
  process.exit(0);
});
"
```

### 3.4 Create Initial Admin User

```bash
# You'll need to create a script or use your existing auth route
# Create backend/scripts/createAdmin.js:
```

Create file `backend/scripts/createAdmin.js`:
```javascript
require('dotenv').config();
const { User } = require('../models');

async function createAdmin() {
  try {
    const admin = await User.create({
      username: 'admin',
      password: 'changeme123',  // Change this!
      role: 'admin'
    });
    console.log('Admin user created:', admin.username);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
```

Run it:
```bash
node scripts/createAdmin.js
```

### 3.5 Start Backend with PM2

```bash
cd /var/www/bale-tracker/backend
pm2 start server.js --name bale-tracker-api
pm2 save
pm2 startup  # Follow the instructions it provides
```

Verify it's running:
```bash
pm2 status
pm2 logs bale-tracker-api
curl http://localhost:5000/api/health
```

---

## Step 4: Build and Configure Frontend

### 4.1 Update API URL

```bash
cd /var/www/bale-tracker/frontend
nano src/services/api.js
```

Update the API base URL:
```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'  // Relative URL, Apache will proxy it
  : 'http://localhost:5000/api';
```

### 4.2 Install Dependencies and Build

```bash
cd /var/www/bale-tracker/frontend
npm install
npm run build
```

This creates `frontend/dist/` with production-ready static files.

### 4.3 Copy Build to Apache Directory

```bash
sudo mkdir -p /var/www/html/bale-tracker
sudo cp -r /var/www/bale-tracker/frontend/dist/* /var/www/html/bale-tracker/
sudo chown -R www-data:www-data /var/www/html/bale-tracker
```

---

## Step 5: Configure Apache

### 5.1 Create Virtual Host Configuration

```bash
sudo nano /etc/apache2/sites-available/bale-tracker.conf
```

Add this configuration:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    DocumentRoot /var/www/html/bale-tracker

    # Proxy API requests to Node.js backend
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    <Directory /var/www/html/bale-tracker>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # React Router support - redirect all requests to index.html
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_FILENAME} !-l
        RewriteRule . /index.html [L]
    </Directory>

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/bale-tracker-error.log
    CustomLog ${APACHE_LOG_DIR}/bale-tracker-access.log combined
</VirtualHost>
```

### 5.2 Enable Site and Restart Apache

```bash
# Disable default site
sudo a2dissite 000-default.conf

# Enable bale-tracker site
sudo a2ensite bale-tracker.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

---

## Step 6: Setup SSL (HTTPS) - Recommended

### 6.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-apache
```

### 6.2 Obtain SSL Certificate

```bash
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will:
- Obtain certificate from Let's Encrypt
- Automatically configure Apache for HTTPS
- Set up automatic renewal

### 6.3 Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 7: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Apache Full'

# Enable firewall if not already enabled
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 8: Post-Deployment Tasks

### 8.1 Verify Application is Running

1. Visit `https://yourdomain.com`
2. Log in with admin credentials
3. Check that all features work:
   - Login/logout
   - Create deliveries
   - Manage bales
   - Update settings (SMHI location, email config)

### 8.2 Configure Settings in UI

1. Go to Settings page (admin only)
2. Set SMHI location (latitude/longitude)
3. Configure email notifications:
   - SMTP host, port, username, password
   - Notification recipient email
   - Enable notifications
4. Set warning thresholds (winter/summer days)

### 8.3 Verify Scheduled Tasks

Check PM2 logs to confirm cron jobs are initialized:
```bash
pm2 logs bale-tracker-api
```

You should see:
```
Warm prediction scheduler initialized (runs daily at 6 AM)
Overdue bale notification scheduler initialized (runs daily at 8 AM)
```

### 8.4 Test Email Notifications (Optional)

Manually trigger the email check:
```bash
cd /var/www/bale-tracker/backend
node -e "
const emailService = require('./services/emailService');
emailService.checkAndNotifyOverdueBales().then(() => {
  console.log('Test complete');
  process.exit(0);
});
"
```

---

## Step 9: Monitoring and Maintenance

### 9.1 Monitor Backend Process

```bash
# View status
pm2 status

# View logs
pm2 logs bale-tracker-api

# Restart if needed
pm2 restart bale-tracker-api

# Stop
pm2 stop bale-tracker-api
```

### 9.2 Monitor Apache

```bash
# Check status
sudo systemctl status apache2

# View logs
sudo tail -f /var/log/apache2/bale-tracker-error.log
sudo tail -f /var/log/apache2/bale-tracker-access.log

# Restart if needed
sudo systemctl restart apache2
```

### 9.3 Database Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-bale-tracker.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/bale-tracker"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /var/www/bale-tracker/backend/production.sqlite \
   $BACKUP_DIR/production_${DATE}.sqlite

# Keep only last 30 days
find $BACKUP_DIR -name "production_*.sqlite" -mtime +30 -delete

echo "Backup completed: production_${DATE}.sqlite"
```

Make executable and add to cron:
```bash
sudo chmod +x /usr/local/bin/backup-bale-tracker.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-bale-tracker.sh
```

---

## Step 10: Updating the Application

### 10.1 Update Backend

```bash
cd /var/www/bale-tracker

# Pull latest code (if using git)
git pull

# Update backend dependencies
cd backend
npm install --production

# Restart backend
pm2 restart bale-tracker-api

# Check logs
pm2 logs bale-tracker-api
```

### 10.2 Update Frontend

```bash
cd /var/www/bale-tracker/frontend

# Update dependencies
npm install

# Rebuild
npm run build

# Copy to Apache directory
sudo cp -r dist/* /var/www/html/bale-tracker/
sudo chown -R www-data:www-data /var/www/html/bale-tracker

# Clear browser cache or do hard refresh
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs bale-tracker-api

# Check if port 5000 is in use
sudo lsof -i :5000

# Verify .env file exists
cat /var/www/bale-tracker/backend/.env

# Check database permissions
ls -la /var/www/bale-tracker/backend/*.sqlite
```

### Apache shows errors
```bash
# Check Apache error logs
sudo tail -100 /var/log/apache2/bale-tracker-error.log

# Test Apache config
sudo apache2ctl configtest

# Check if modules are enabled
apache2ctl -M | grep proxy
apache2ctl -M | grep rewrite
```

### API requests fail (CORS)
Check `backend/.env` has correct `FRONTEND_URL`:
```env
FRONTEND_URL=https://yourdomain.com
```

Restart backend after changes:
```bash
pm2 restart bale-tracker-api
```

### Scheduled tasks not running
```bash
# Check if backend is running
pm2 status

# Check logs for cron initialization messages
pm2 logs bale-tracker-api | grep scheduler

# Verify time zone is correct
date
timedatectl
```

### Email notifications not working
1. Check settings are configured in UI
2. Verify SMTP credentials are correct
3. Check if port 587 (or your SMTP port) is open
4. Test manually (see Step 8.4)

---

## Security Checklist

- [ ] Changed default admin password
- [ ] JWT_SECRET is a secure random string
- [ ] SSL/HTTPS is enabled
- [ ] Firewall is configured (only ports 80, 443 open)
- [ ] Database file has proper permissions (not world-readable)
- [ ] .env file is not publicly accessible
- [ ] Regular backups are scheduled
- [ ] Apache security headers configured (optional but recommended)
- [ ] PM2 is set to auto-start on server reboot

---

## Performance Optimization (Optional)

### Enable Gzip Compression

```bash
sudo a2enmod deflate
```

Add to Apache config:
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

### Enable Browser Caching

Add to Apache config inside `<Directory>` block:
```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

---

## Support

If you encounter issues:
1. Check the logs (PM2 and Apache)
2. Verify all configuration files
3. Ensure all prerequisites are installed
4. Check file permissions

The application includes:
- Health check endpoint: `https://yourdomain.com/api/health`
- Scheduled tasks logs in PM2: `pm2 logs bale-tracker-api`

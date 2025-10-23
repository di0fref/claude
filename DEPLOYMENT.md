# Deployment Guide - Bale Tracker Application

This guide covers deploying the Bale Tracker application to a production server with Apache.

## Prerequisites

- FreeBSD or Linux server (this guide is adapted for non-root deployment)
- Apache 2.4+ (pre-installed and configured by hosting provider)
- Node.js 18+ and npm (check with `node --version`)
- MySQL database (check with `mysql --version`)
- Domain name pointed to your server
- SSH access to your hosting account

**Note:** This guide assumes you **don't have root/sudo access**. Most shared hosting environments have Apache and MySQL pre-installed.

## Architecture

- **Frontend**: React app built to static files, served by Apache
- **Backend**: Node.js/Express API running on port 5000, managed with nohup/screen
- **Database**: MySQL database (both development and production)
- **Scheduled Tasks**: node-cron running inside Node.js process (6 AM warm predictions, 8 AM email notifications)

---

## Step 1: Verify Server Environment

Since you're on a shared hosting environment without root access, verify what's already installed:

```bash
# Check Node.js
node --version
npm --version

# Check MySQL
mysql --version

# Check available commands
which nohup screen tmux
```

**If Node.js is not installed or version is too old**, contact your hosting provider or check if tools like `nvm` (Node Version Manager) are available for user-level installation.

### 1.1 Create MySQL Database

Use your hosting provider's control panel (cPanel, Plesk, etc.) or command line:

```bash
# Log into MySQL (password may be required)
mysql -u your_username -p

# Create database
CREATE DATABASE bale_delivery_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Show databases to confirm
SHOW DATABASES;

# Exit
EXIT;
```

**Note:** Save your MySQL username and password for the `.env` configuration later.

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

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bale_delivery_tracker
DB_USER=baletracker
DB_PASSWORD=your_secure_password

# CORS (your domain)
FRONTEND_URL=https://yourdomain.com
```

**IMPORTANT**: Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.3 Initialize Production Database

```bash
cd /var/www/bale-tracker

# Run migrations to create tables
npm run migrate

# Seed initial data (creates default admin user and settings)
npm run seed
```

**Important**: The seed will create a default admin user:
- Username: `admin`
- Password: `admin123`
- **Change this password immediately after first login!**

### 3.4 Start Backend (Without Root Access)

Since you don't have root access, use one of these methods:

#### Option A: Using nohup (Recommended)

Create logs directory:
```bash
mkdir -p /var/www/bale-tracker/logs
```

Create `start.sh`:
```bash
cat > /var/www/bale-tracker/start.sh << 'EOF'
#!/bin/sh
cd /var/www/bale-tracker
nohup node backend/server.js > logs/output.log 2>&1 &
echo $! > /tmp/baletracker.pid
echo "Server started with PID $(cat /tmp/baletracker.pid)"
echo "Check logs with: tail -f logs/output.log"
EOF

chmod +x /var/www/bale-tracker/start.sh
```

Create `stop.sh`:
```bash
cat > /var/www/bale-tracker/stop.sh << 'EOF'
#!/bin/sh
if [ -f /tmp/baletracker.pid ]; then
    PID=$(cat /tmp/baletracker.pid)
    kill $PID
    rm /tmp/baletracker.pid
    echo "Server stopped (PID: $PID)"
else
    echo "PID file not found. Finding process manually..."
    pkill -f "node backend/server.js"
    echo "Killed all matching processes"
fi
EOF

chmod +x /var/www/bale-tracker/stop.sh
```

Create `status.sh`:
```bash
cat > /var/www/bale-tracker/status.sh << 'EOF'
#!/bin/sh
if [ -f /tmp/baletracker.pid ]; then
    PID=$(cat /tmp/baletracker.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Server is running (PID: $PID)"
        echo "Logs: tail -f /var/www/bale-tracker/logs/output.log"
    else
        echo "Server is not running (stale PID file)"
        rm /tmp/baletracker.pid
    fi
else
    echo "Server is not running (no PID file)"
fi
EOF

chmod +x /var/www/bale-tracker/status.sh
```

**Usage:**
```bash
# Start server
./start.sh

# Stop server
./stop.sh

# Check status
./status.sh

# View logs
tail -f logs/output.log

# Test API
curl http://localhost:5000/api/health
```

#### Option B: Using screen (Interactive)

If `screen` is available:

```bash
# Start server in screen session
screen -S baletracker
cd /var/www/bale-tracker
node backend/server.js

# Detach: Press Ctrl+A then D

# Reattach later
screen -r baletracker

# List sessions
screen -ls
```

#### Option C: Using tmux (Alternative to screen)

If `tmux` is available:

```bash
# Start server in tmux session
tmux new -s baletracker
cd /var/www/bale-tracker
node backend/server.js

# Detach: Press Ctrl+B then D

# Reattach later
tmux attach -t baletracker

# List sessions
tmux ls
```

**Note:** With nohup, the process continues running even after you disconnect from SSH.

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

### 4.3 Deploy Frontend Files

Copy the built files to your public HTML directory (path may vary by hosting provider):

```bash
# Common paths: ~/public_html, ~/www, ~/htdocs, ~/yourdomain.com
# Replace with your actual path
cp -r /var/www/bale-tracker/frontend/build/* ~/public_html/

# Or if deploying to a subdirectory:
# mkdir -p ~/public_html/app
# cp -r /var/www/bale-tracker/frontend/build/* ~/public_html/app/
```

### 4.4 Copy .htaccess File

Copy the `.htaccess` file to enable React Router support:

```bash
cp /var/www/bale-tracker/frontend/.htaccess ~/public_html/.htaccess
```

**Note:** The `.htaccess` file is already created in `frontend/.htaccess` and includes:
- React Router support (redirects all requests to index.html)
- Security headers
- Gzip compression
- Browser caching for static assets

---

## Step 5: Configure Apache with .htaccess

Since you don't have root access, you'll configure Apache using `.htaccess` files.

### 5.1 Create Root .htaccess for API Proxy

In your document root (e.g., `~/public_html` or `~/yourdomain.com`), create or edit `.htaccess`:

```bash
nano ~/public_html/.htaccess
```

Add this configuration:

```apache
# Enable Rewrite Engine
RewriteEngine On

# Proxy API requests to Node.js backend running on port 5000
# Make sure mod_proxy is enabled (ask your hosting provider if unsure)
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]

# Prevent access to sensitive files
<FilesMatch "^\.">
    Require all denied
</FilesMatch>

# Prevent access to .env files
<Files ".env">
    Require all denied
</Files>

# Prevent directory listing
Options -Indexes
```

### 5.2 Verify .htaccess is Working

Test that .htaccess is being read:

```bash
# This should return 403 Forbidden
curl http://yourdomain.com/.env

# This should proxy to your backend
curl http://localhost:5000/api/health
curl http://yourdomain.com/api/health
```

**Important:** If the proxy doesn't work, contact your hosting provider to ensure:
- `mod_rewrite` is enabled
- `mod_proxy` and `mod_proxy_http` are enabled
- `.htaccess` files are allowed (`AllowOverride All`)

### 5.3 Alternative: Manual Proxy Setup

If proxy modules aren't available, you can use a simple PHP proxy script:

Create `api-proxy.php` in your public directory:

```php
<?php
// Simple API proxy for environments without mod_proxy
$api_base = 'http://localhost:5000/api';
$request_uri = $_SERVER['REQUEST_URI'];

// Extract the API path
if (preg_match('#^/api/(.*)$#', $request_uri, $matches)) {
    $api_path = $matches[1];
    $url = $api_base . '/' . $api_path;

    // Forward the request
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);

    // Forward request method and body
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
    }

    // Forward headers
    $headers = [];
    foreach (getallheaders() as $key => $value) {
        if (strtolower($key) !== 'host') {
            $headers[] = "$key: $value";
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    // Execute and return
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($status);
    header('Content-Type: application/json');
    echo $response;
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
}
?>
```

Then update frontend `.htaccess`:
```apache
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ /api-proxy.php [L]
```

---

## Step 6: Setup SSL (HTTPS) - Recommended

Since you don't have root access, SSL setup depends on your hosting provider:

### Option 1: Use Hosting Provider's Control Panel

Most hosting providers (cPanel, Plesk, etc.) offer free Let's Encrypt SSL certificates:

1. Log into your hosting control panel
2. Find "SSL/TLS" or "Let's Encrypt" section
3. Enable SSL for your domain
4. Force HTTPS redirect (usually a checkbox option)

### Option 2: Force HTTPS via .htaccess

If SSL is enabled, add this to the **top** of your root `.htaccess`:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### Option 3: Contact Your Hosting Provider

Ask them to:
- Enable Let's Encrypt SSL for your domain
- Set up automatic renewal
- Configure HTTPS redirect

---

## Step 7: Post-Deployment Tasks

### 7.1 Verify Application is Running

1. Visit `https://yourdomain.com`
2. Log in with admin credentials
3. Check that all features work:
   - Login/logout
   - Create deliveries
   - Manage bales
   - Update settings (SMHI location, email config)

### 7.2 Configure Settings in UI

1. Go to Settings page (admin only)
2. Set SMHI location (latitude/longitude)
3. Configure email notifications:
   - SMTP host, port, username, password
   - Notification recipient email
   - Enable notifications
4. Set warning thresholds (winter/summer days)

### 7.3 Verify Scheduled Tasks

Check application logs to confirm cron jobs are initialized:
```bash
tail -f /var/www/bale-tracker/logs/output.log
```

You should see:
```
Warm prediction scheduler initialized (runs daily at 6 AM)
Overdue bale notification scheduler initialized (runs daily at 8 AM)
```

### 7.4 Test Email Notifications (Optional)

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

## Step 8: Monitoring and Maintenance

### 8.1 Monitor Backend Process

```bash
# Check status
./status.sh

# View logs (live)
tail -f logs/output.log

# View recent logs
tail -100 logs/output.log

# Check if process is running
ps aux | grep "node backend/server.js"

# Restart server
./stop.sh && ./start.sh

# Stop server
./stop.sh
```

### 8.2 Monitor Apache

```bash
# Check status
sudo systemctl status apache2

# View logs
sudo tail -f /var/log/apache2/bale-tracker-error.log
sudo tail -f /var/log/apache2/bale-tracker-access.log

# Restart if needed
sudo systemctl restart apache2
```

### 8.3 Database Backups

**For MySQL:**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-bale-tracker.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/bale-tracker"
DATE=$(date +%Y%m%d_%H%M%S)
DB_USER="baletracker"
DB_PASS="your_secure_password"
DB_NAME="bale_delivery_tracker"

mkdir -p $BACKUP_DIR

# Backup MySQL database
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_${DATE}.sql

# Compress the backup
gzip $BACKUP_DIR/backup_${DATE}.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_${DATE}.sql.gz"
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

## Step 9: Updating the Application

### 9.1 Update Backend

```bash
cd /var/www/bale-tracker

# Pull latest code (if using git)
git pull

# Update dependencies
npm install --production

# Stop the server
./stop.sh

# Start the server
./start.sh

# Check logs
tail -f logs/output.log
```

### 9.2 Update Frontend

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
tail -100 /var/www/bale-tracker/logs/output.log

# Check if port 5000 is in use
lsof -i :5000
# or
sockstat -l | grep 5000

# Verify .env file exists
cat /var/www/bale-tracker/.env

# Check if process is running
ps aux | grep "node backend/server.js"

# Try starting manually to see errors
cd /var/www/bale-tracker
node backend/server.js
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
./stop.sh && ./start.sh
```

### Scheduled tasks not running
```bash
# Check if backend is running
./status.sh

# Check logs for cron initialization messages
grep scheduler /var/www/bale-tracker/logs/output.log

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
- [ ] MySQL database credentials are secure
- [ ] .env file is not publicly accessible (check permissions: `chmod 600 .env`)
- [ ] Regular backups are scheduled
- [ ] Apache security headers configured (optional but recommended)
- [ ] Server restart script is ready (consider cron @reboot if supported)

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

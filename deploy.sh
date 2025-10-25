#!/bin/bash

# Deployment Script for Claude Bale Tracker
# This script builds locally and deploys to production server

set -e  # Exit on any error

# Configuration
SERVER="s6411@ssh.i8t.com"
REMOTE_PATH="/home/s6411/fahlstad.se/hay"
LOCAL_PATH="/Users/fredrik/www/claude"

echo "=========================================="
echo "  Claude Bale Tracker - Deployment"
echo "=========================================="
echo ""

# Step 0: Git Commit and Push
echo "📝 Committing changes to git..."
cd "$LOCAL_PATH"

# Check if there are any changes to commit
if [[ -n $(git status -s) ]]; then
    # Add all changes
    git add .

    # Create commit with timestamp
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    git commit -m "Deploy: $TIMESTAMP

🤖 Generated with Claude Code
https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>"

    # Push to remote
    git push
    echo "✅ Changes committed and pushed to git"
else
    echo "ℹ️  No changes to commit"
fi
echo ""

# Step 1: Build Frontend
echo "📦 Building frontend..."
cd "$LOCAL_PATH/frontend"
REACT_APP_API_URL=/api npm run build
echo "✅ Frontend built successfully"
echo ""

# Step 2: Upload Backend
echo "📤 Uploading backend..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'database.sqlite' \
  --exclude 'config/config.json' \
  "$LOCAL_PATH/backend/" \
  "$SERVER:$REMOTE_PATH/backend/"
echo "✅ Backend uploaded"
echo ""

# Step 3: Upload Frontend Build
echo "📤 Uploading frontend build..."
rsync -avz --delete \
  --exclude 'backend' \
  --exclude 'logs' \
  --exclude '.env' \
  --exclude '.htaccess' \
  --exclude 'api-proxy.php' \
  "$LOCAL_PATH/frontend/build/" \
  "$SERVER:$REMOTE_PATH/"
echo "✅ Frontend uploaded"
echo ""

# Step 4: Upload .htaccess and API proxy
echo "📤 Uploading .htaccess and API proxy..."
scp "$LOCAL_PATH/.htaccess" "$SERVER:$REMOTE_PATH/"
scp "$LOCAL_PATH/api-proxy.php" "$SERVER:$REMOTE_PATH/"
echo "✅ .htaccess and API proxy uploaded"
echo ""

# Step 5: Upload Scripts
echo "📤 Uploading deployment scripts..."
scp "$LOCAL_PATH/start.sh" "$SERVER:$REMOTE_PATH/" 2>/dev/null || echo "start.sh not found (will be created on server)"
scp "$LOCAL_PATH/stop.sh" "$SERVER:$REMOTE_PATH/" 2>/dev/null || echo "stop.sh not found (will be created on server)"
scp "$LOCAL_PATH/status.sh" "$SERVER:$REMOTE_PATH/" 2>/dev/null || echo "status.sh not found (will be created on server)"
echo ""

# Step 6: Upload package.json (for npm install)
echo "📤 Uploading package.json..."
scp "$LOCAL_PATH/package.json" "$SERVER:$REMOTE_PATH/"
echo ""

# Step 7: Install Dependencies on Server
echo "📦 Installing dependencies on server..."
ssh "$SERVER" "cd $REMOTE_PATH && npm install --production"
echo "✅ Dependencies installed"
echo ""

# Step 8: Restart Server
echo "🔄 Restarting application..."
ssh "$SERVER" << 'EOF'
cd /home/s6411/fahlstad.se/hay

# Stop existing server
if [ -f /tmp/baletracker.pid ]; then
    echo "Stopping existing server..."
    kill $(cat /tmp/baletracker.pid) 2>/dev/null || true
    rm /tmp/baletracker.pid
fi

# Make scripts executable
chmod +x start.sh stop.sh status.sh 2>/dev/null || true

# Start server in production mode
echo "Starting server..."
NODE_ENV=production nohup node backend/server.js > logs/output.log 2>&1 &
echo $! > /tmp/baletracker.pid
echo "Server started with PID $(cat /tmp/baletracker.pid)"
EOF

echo ""
echo "✅ Deployment complete!"
echo ""
echo "View logs: ssh $SERVER 'tail -f $REMOTE_PATH/logs/output.log'"
echo "Check status: ssh $SERVER 'cd $REMOTE_PATH && ./status.sh'"
echo "Visit: https://hay.fahlstad.se"
echo ""

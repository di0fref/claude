#!/bin/sh
if [ -f /tmp/baletracker.pid ]; then
    PID=$(cat /tmp/baletracker.pid)
    kill $PID 2>/dev/null
    rm /tmp/baletracker.pid
    echo "Server stopped (PID: $PID)"
else
    echo "PID file not found. Finding process manually..."
    pkill -f "node backend/server.js"
    echo "Killed all matching processes"
fi

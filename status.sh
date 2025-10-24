#!/bin/sh
if [ -f /tmp/baletracker.pid ]; then
    PID=$(cat /tmp/baletracker.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Server is running (PID: $PID)"
        echo "Logs: tail -f /home/s6411/fahlstad.se/hay/logs/output.log"
    else
        echo "Server is not running (stale PID file)"
        rm /tmp/baletracker.pid
    fi
else
    echo "Server is not running (no PID file)"
fi

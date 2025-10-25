#!/bin/sh
cd /home/s6411/fahlstad.se/hay
mkdir -p logs
nohup node backend/server.js > logs/output.log 2>&1 &
echo $! > /tmp/baletracker.pid
echo "Server started with PID $(cat /tmp/baletracker.pid)"
echo "Check logs with: tail -f logs/output.log"

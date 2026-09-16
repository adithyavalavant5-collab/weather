#!/bin/bash
# Supervisor for weather-simulator — keeps it alive forever
# Usage: bash supervisor.sh &

cd /home/z/my-project/mini-services/weather-simulator

LOG=/tmp/weather-sim.log
PIDFILE=/tmp/weather-sim.pid

while true; do
  # Check if process is still running
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
      # Still running, wait and check again
      sleep 5
      continue
    fi
  fi

  echo "[$(date)] Starting weather-simulator..." >> "$LOG"
  bun index.ts >> "$LOG" 2>&1 &
  PID=$!
  echo "$PID" > "$PIDFILE"
  echo "[$(date)] Started weather-simulator with PID $PID" >> "$LOG"

  # Wait for it to exit (or be killed)
  wait "$PID"
  EXIT_CODE=$?
  echo "[$(date)] weather-simulator exited with code $EXIT_CODE, restarting in 2s..." >> "$LOG"
  rm -f "$PIDFILE"
  sleep 2
done

#!/bin/bash

# SOCflow Automated Zero-Downtime Update Script
# Run this script with sudo: sudo ./update.sh

set -e

echo "=========================================="
echo " Starting SOCflow Application Update      "
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run this script as root (sudo ./update.sh)"
  exit 1
fi

APP_DIR=$(pwd)

echo "[1/4] Pulling latest code from repository..."
git pull origin main || echo "[WARNING] Git pull failed or not in a git repository. Proceeding with local files."

echo "[2/4] Updating Node.js Backend API..."
cd "$APP_DIR/backend"
npm install --production
# Restarting the backend service (minimal downtime)
systemctl restart socflow-backend
echo "Backend updated and restarted."

echo "[3/4] Updating Python Detection Engine..."
cd "$APP_DIR/server"
# Use existing virtual environment to update dependencies safely
source venv/bin/activate
pip install -r requirements.txt --upgrade
deactivate
# Restarting the engine service
systemctl restart socflow-engine
echo "Detection Engine updated and restarted."

echo "[4/4] Updating React Frontend UI..."
cd "$APP_DIR"
npm install
# Build the new UI payload
npm run build
# Reload Nginx gracefully without dropping active connections
systemctl reload nginx
echo "Frontend built and Nginx reloaded."

echo "=========================================="
echo " SOCflow Update Completed Successfully!   "
echo " All services are running on the latest   "
echo " version without any major downtime.      "
echo "=========================================="

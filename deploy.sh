#!/bin/bash

# ==============================================================================
# SOCflow Bare-Metal Automated Deployment Script
# Living-off-the-Land (LotL) Attack Detection Platform
#
# Usage:
#   sudo ./deploy.sh
# ==============================================================================

set -e

# Non-interactive apt installation
export DEBIAN_FRONTEND=noninteractive

echo "=========================================================="
echo "      Starting SOCflow Bare-Metal Automated Deployment    "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo -e "\e[31m[ERROR]\e[0m Please run this script with root privileges (sudo ./deploy.sh)"
  exit 1
fi

APP_DIR=$(pwd)
DB_USER="socflow"
DB_PASS="socflow_pass"
DB_NAME="socflow"
ACTUAL_USER="${SUDO_USER:-root}"

echo -e "\n\e[34m[1/7]\e[0m Installing System Technologies & Dependencies..."
apt-get update -y
apt-get install -y curl git redis-server mysql-server nginx python3-pip python3-venv

# Install Node.js 18.x LTS if not present
if ! command -v node > /dev/null; then
    echo "Node.js not detected. Installing Node.js 18.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo -e "\n\e[34m[2/7]\e[0m Provisioning MySQL Database & Dedicated User..."
systemctl start mysql
systemctl enable mysql

# Create database and dedicated application user with native password authentication
mysql -u root <<EOF || true
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF

# Fallback check for MySQL 8.4+ caching_sha2_password if native fails
mysql -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'; GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1'; FLUSH PRIVILEGES;" || true

# Apply the database schema
if [ -f "$APP_DIR/database/mysql_schema.sql" ]; then
    echo "Importing schema from database/mysql_schema.sql..."
    mysql -u root "${DB_NAME}" < "$APP_DIR/database/mysql_schema.sql" || \
    mysql -u "${DB_USER}" -p"${DB_PASS}" -h 127.0.0.1 "${DB_NAME}" < "$APP_DIR/database/mysql_schema.sql"
    echo "Database schema imported successfully."
else
    echo -e "\e[33m[WARNING]\e[0m Schema file database/mysql_schema.sql not found!"
fi

echo -e "\n\e[34m[3/7]\e[0m Configuring Node.js Backend API Service..."
cd "$APP_DIR/backend"
npm install --production

# Configure systemd daemon for backend API
cat << EOF > /etc/systemd/system/socflow-backend.service
[Unit]
Description=SOCflow Node.js Backend API Gateway
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node server.js
Environment="NODE_ENV=production"
Environment="DB_HOST=127.0.0.1"
Environment="DB_USER=${DB_USER}"
Environment="DB_PASSWORD=${DB_PASS}"
Environment="DB_NAME=${DB_NAME}"
Environment="REDIS_URL=redis://127.0.0.1:6379"
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

echo -e "\n\e[34m[4/7]\e[0m Configuring Python Behavioral Detection Engine..."
cd "$APP_DIR/server"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Configure systemd daemon for detection engine
cat << EOF > /etc/systemd/system/socflow-engine.service
[Unit]
Description=SOCflow Python LOLBin Detection Engine
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=$APP_DIR/server
ExecStart=$APP_DIR/server/venv/bin/python analyzer.py
Environment="DB_HOST=127.0.0.1"
Environment="DB_USER=${DB_USER}"
Environment="DB_PASSWORD=${DB_PASS}"
Environment="DB_NAME=${DB_NAME}"
Environment="REDIS_URL=redis://127.0.0.1:6379"
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

echo -e "\n\e[34m[5/7]\e[0m Building Frontend SPA & Configuring Nginx Reverse Proxy..."
cd "$APP_DIR"
npm install
npm run build

# Ensure web server (www-data) can read static dist assets
chown -R ${ACTUAL_USER}:${ACTUAL_USER} "$APP_DIR/dist" 2>/dev/null || true
chmod o+x /home /home/* 2>/dev/null || true
chmod -R o+r "$APP_DIR/dist" 2>/dev/null || true

# Nginx virtual host configuration
cat << EOF > /etc/nginx/sites-available/socflow
server {
    listen 80;
    server_name _;
    root $APP_DIR/dist;
    index index.html;

    # Serve React SPA with client-side fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API traffic to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/socflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo -e "\n\e[34m[6/7]\e[0m Starting & Enabling Daemons..."
systemctl daemon-reload
systemctl enable redis-server && systemctl restart redis-server
systemctl enable socflow-backend && systemctl restart socflow-backend
systemctl enable socflow-engine && systemctl restart socflow-engine
systemctl enable nginx && systemctl restart nginx

# Allow daemons time to complete socket initialization
sleep 3

echo -e "\n\e[34m[7/7]\e[0m Running Comprehensive System Health Checks..."
echo "=========================================================="

CHECK_FAILED=0

check_service() {
    if systemctl is-active --quiet "$1"; then
        echo -e "[\e[32mOK\e[0m] Daemon Service: $1 is running."
    else
        echo -e "[\e[31mFAIL\e[0m] Daemon Service: $1 is NOT running!"
        CHECK_FAILED=1
    fi
}

check_service "mysql"
check_service "redis-server"
check_service "nginx"
check_service "socflow-backend"
check_service "socflow-engine"

echo "----------------------------------------------------------"

# Health Check: Frontend Web Delivery
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ || true)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "[\e[32mOK\e[0m] Frontend Web Delivery: Responding with HTTP 200 on port 80."
else
    echo -e "[\e[31mFAIL\e[0m] Frontend Web Delivery: Returned HTTP ${FRONTEND_STATUS}."
    CHECK_FAILED=1
fi

# Health Check: Redis Message Queue Ping
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "[\e[32mOK\e[0m] Message Queue: Redis responding (PONG)."
else
    echo -e "[\e[31mFAIL\e[0m] Message Queue: Redis connection failed."
    CHECK_FAILED=1
fi

# Health Check: MySQL Database Connectivity
if mysql -u "${DB_USER}" -p"${DB_PASS}" -h 127.0.0.1 -e "USE ${DB_NAME}; SELECT 1;" &>/dev/null; then
    echo -e "[\e[32mOK\e[0m] Database: MySQL application credentials verified."
else
    echo -e "[\e[31mFAIL\e[0m] Database: MySQL connection failed for user '${DB_USER}'."
    CHECK_FAILED=1
fi

# Health Check: Backend Ingestion API Proxy
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/connection/verify || true)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "[\e[32mOK\e[0m] Backend API Proxy: Nginx -> Express API routing verified (HTTP 200)."
else
    echo -e "[\e[31mFAIL\e[0m] Backend API Proxy: Routing failed (HTTP ${BACKEND_STATUS})."
    CHECK_FAILED=1
fi

echo "=========================================================="

if [ "$CHECK_FAILED" -eq 0 ]; then
    echo -e "\e[32m✔ SOCflow Bare-Metal Deployment Completed Successfully!\e[0m"
    echo -e "Access the SOC Dashboard at: \e[36mhttp://localhost/\e[0m (or your server's public IP)"
    echo -e "\nDemo Credentials:"
    echo -e "  Manager: \e[33mmanager@socflow.local\e[0m / \e[32mSOCflow2026!\e[0m"
    echo -e "  Analyst: \e[33manalyst@socflow.local\e[0m / \e[32mSOCflow2026!\e[0m"
else
    echo -e "\e[31m✘ Deployment completed with warnings. Check logs above.\e[0m"
fi
echo "=========================================================="

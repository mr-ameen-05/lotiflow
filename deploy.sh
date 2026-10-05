#!/bin/bash

# SOCflow Bare-Metal Automated Deployment Script
# Run this script with sudo: sudo ./deploy.sh

set -e

# Ensure non-interactive package installations
export DEBIAN_FRONTEND=noninteractive

echo "=========================================="
echo " Starting SOCflow Bare-Metal Deployment   "
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run this script as root (sudo ./deploy.sh)"
  exit 1
fi

APP_DIR=$(pwd)

echo "[1/7] Installing System Dependencies..."
apt-get update -y
apt-get install -y curl git redis-server mysql-server nginx python3-pip python3-venv

# Install Node.js 18.x automatically if not present
if ! command -v node > /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "[2/7] Configuring MySQL Database..."
systemctl start mysql
systemctl enable mysql

# Secure MySQL and setup database automatically
mysql -u root -e "CREATE DATABASE IF NOT EXISTS socflow;" || true
if [ -f "$APP_DIR/database/mysql_schema.sql" ]; then
    mysql -u root socflow < "$APP_DIR/database/mysql_schema.sql"
    echo "MySQL schema imported successfully."
else
    echo "[WARNING] Schema file database/mysql_schema.sql not found!"
fi

echo "[3/7] Setting up Node.js Backend API..."
cd "$APP_DIR/backend"
npm install --production

cat << EOF > /etc/systemd/system/socflow-backend.service
[Unit]
Description=SOCflow Node.js Backend API
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node server.js
Environment="NODE_ENV=production"
Environment="DB_HOST=127.0.0.1"
Environment="DB_USER=root"
Environment="DB_PASSWORD="
Environment="DB_NAME=socflow"
Environment="REDIS_URL=redis://127.0.0.1:6379"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

echo "[4/7] Setting up Python Detection Engine..."
cd "$APP_DIR/server"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

cat << EOF > /etc/systemd/system/socflow-engine.service
[Unit]
Description=SOCflow Python Detection Engine
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$APP_DIR/server
ExecStart=$APP_DIR/server/venv/bin/python analyzer.py
Environment="DB_HOST=127.0.0.1"
Environment="DB_USER=root"
Environment="DB_PASSWORD="
Environment="DB_NAME=socflow"
Environment="REDIS_URL=redis://127.0.0.1:6379"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

echo "[5/7] Building React Frontend & Configuring Nginx..."
cd "$APP_DIR"
npm install
npm run build

cat << EOF > /etc/nginx/sites-available/socflow
server {
    listen 80;
    server_name _;
    root $APP_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/socflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "[6/7] Starting all SOCflow Services..."
systemctl daemon-reload
systemctl enable redis-server && systemctl restart redis-server
systemctl enable socflow-backend && systemctl restart socflow-backend
systemctl enable socflow-engine && systemctl restart socflow-engine
systemctl enable nginx && systemctl restart nginx

# Give services a few seconds to boot up before health checking
sleep 3

echo "[7/7] Performing Full System Health Check..."
echo "------------------------------------------"

check_service() {
    if systemctl is-active --quiet "$1"; then
        echo -e "[\e[32mOK\e[0m] Service: $1 is running."
    else
        echo -e "[\e[31mFAIL\e[0m] Service: $1 is down!"
    fi
}

check_service "mysql"
check_service "redis-server"
check_service "nginx"
check_service "socflow-backend"
check_service "socflow-engine"

echo "------------------------------------------"
# Test HTTP connections
if curl -s --head  --request GET http://127.0.0.1 | grep "200" > /dev/null; then
    echo -e "[\e[32mOK\e[0m] Frontend (Nginx) is responding on port 80."
else
    echo -e "[\e[31mFAIL\e[0m] Frontend (Nginx) failed to respond on port 80."
fi

# Note: /api/ endpoint might return 404 or 401 depending on routes, but if we can reach it, proxy is working.
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/ | grep -qE "200|404|401"; then
    echo -e "[\e[32mOK\e[0m] Backend API proxy is routing successfully."
else
    echo -e "[\e[31mFAIL\e[0m] Backend API proxy is failing."
fi

echo "=========================================="
echo " SOCflow Deployment Completed Successfully!"
echo " Access the dashboard at: http://localhost/"
echo "=========================================="

#!/bin/bash

# ==============================================================================
# SOCflow Bare-Metal Production Automated Deployment Script
# Living-off-the-Land (LotL) Attack Detection Platform
#
# Features:
#   - Interactive Public IP Prompt (with automatic detection fallback)
#   - Auto-Generated Cryptographic Passwords & Secrets
#   - Self-Signed TLS/SSL Certificate Generation (HTTPS)
#   - Nginx HTTP (Port 80) -> HTTPS (Port 443) Automatic Redirect
#   - Systemd Service Configuration & Live Health Checks
#
# Usage:
#   sudo ./deploy.sh
# ==============================================================================

set -e

# Non-interactive apt installation
export DEBIAN_FRONTEND=noninteractive

echo "=========================================================="
echo "    Starting SOCflow Production Bare-Metal Deployment     "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo -e "\e[31m[ERROR]\e[0m Please run this script with root privileges (sudo ./deploy.sh)"
  exit 1
fi

APP_DIR=$(pwd)
ACTUAL_USER="${SUDO_USER:-root}"

# ------------------------------------------------------------------------------
# 1. Interactive Public IP / Domain Configuration
# ------------------------------------------------------------------------------
DETECTED_IP=$(curl -s --connect-timeout 3 https://api.ipify.org || curl -s --connect-timeout 3 https://ifconfig.me || hostname -I | awk '{print $1}')

echo -e "\n\e[34m[Setup]\e[0m Network & Production Address Configuration:"
read -p "Enter Server Public IP or Domain [Detected: ${DETECTED_IP}]: " INPUT_IP
SERVER_IP="${INPUT_IP:-${DETECTED_IP}}"
echo -e "--> Deploying for Server Address: \e[32m${SERVER_IP}\e[0m"

# ------------------------------------------------------------------------------
# 2. Auto-Generate Cryptographic Passwords & Secrets
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[Setup]\e[0m Generating Cryptographic Credentials..."
DB_NAME="socflow"
DB_USER="socflow"
DB_PASS=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)
ENROLLMENT_SECRET="SOCflow-Enroll-2026!"

# Save credentials securely to local credentials file with restricted permissions
cat << EOF > "$APP_DIR/socflow_credentials.txt"
==================================================
        SOCflow Deployment Credentials
==================================================
Deployment Date : $(date)
Server Address  : https://${SERVER_IP}

MySQL Database:
  Host          : 127.0.0.1
  Database      : ${DB_NAME}
  User          : ${DB_USER}
  Password      : ${DB_PASS}

Endpoint Enrollment Secret:
  Secret Key    : ${ENROLLMENT_SECRET}

Pre-seeded Web Portal Logins:
  Manager       : manager@socflow.local / SOCflow2026!
  Analyst       : analyst@socflow.local / SOCflow2026!
==================================================
EOF
chmod 600 "$APP_DIR/socflow_credentials.txt"
chown ${ACTUAL_USER}:${ACTUAL_USER} "$APP_DIR/socflow_credentials.txt" 2>/dev/null || true

echo -e "--> Database & session credentials generated. Saved to: \e[36m$APP_DIR/socflow_credentials.txt\e[0m"

# ------------------------------------------------------------------------------
# 3. System Technologies & Dependencies
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[1/7]\e[0m Installing System Technologies & Dependencies..."
apt-get update -y
apt-get install -y curl git redis-server mysql-server nginx python3-pip python3-venv openssl

# Install Node.js 18.x LTS if not present
if ! command -v node > /dev/null; then
    echo "Node.js not detected. Installing Node.js 18.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# ------------------------------------------------------------------------------
# 4. Generate Self-Signed SSL/TLS Certificates
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[2/7]\e[0m Generating Self-Signed TLS/SSL Certificates..."
SSL_DIR="/etc/ssl/socflow"
mkdir -p "$SSL_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/socflow.key" \
    -out "$SSL_DIR/socflow.crt" \
    -subj "/C=US/ST=Security/L=Operations/O=SOCflow/CN=${SERVER_IP}" 2>/dev/null

chmod 600 "$SSL_DIR/socflow.key"
chmod 644 "$SSL_DIR/socflow.crt"
echo "--> SSL certificates generated at $SSL_DIR (CN=${SERVER_IP})"

# ------------------------------------------------------------------------------
# 5. Provision MySQL Database & Dedicated User
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[3/7]\e[0m Provisioning MySQL Database & Dedicated User..."
systemctl start mysql
systemctl enable mysql

# Create database and dedicated application user with auto-generated password
mysql -u root <<EOF || true
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF

# Apply database schema
if [ -f "$APP_DIR/database/mysql_schema.sql" ]; then
    echo "Importing schema from database/mysql_schema.sql..."
    mysql -u root "${DB_NAME}" < "$APP_DIR/database/mysql_schema.sql" || \
    mysql -u "${DB_USER}" -p"${DB_PASS}" -h 127.0.0.1 "${DB_NAME}" < "$APP_DIR/database/mysql_schema.sql"
    echo "Database schema imported successfully."
else
    echo -e "\e[33m[WARNING]\e[0m Schema file database/mysql_schema.sql not found!"
fi

# ------------------------------------------------------------------------------
# 6. Configure Node.js Backend API Service
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[4/7]\e[0m Configuring Node.js Backend API Service..."
cd "$APP_DIR/backend"
npm install --production

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
Environment="PORT=5001"
Environment="DB_HOST=127.0.0.1"
Environment="DB_USER=${DB_USER}"
Environment="DB_PASSWORD=${DB_PASS}"
Environment="DB_NAME=${DB_NAME}"
Environment="REDIS_URL=redis://127.0.0.1:6379"
Environment="SESSION_SECRET=${SESSION_SECRET}"
Environment="ENROLLMENT_SECRET=${ENROLLMENT_SECRET}"
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# ------------------------------------------------------------------------------
# 7. Configure Python Detection Engine
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[5/7]\e[0m Configuring Python LOLBin Detection Engine..."
cd "$APP_DIR/server"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

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

# ------------------------------------------------------------------------------
# 8. Build Frontend SPA & Configure Nginx (HTTPS + HTTP Redirect)
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[6/7]\e[0m Building Frontend SPA & Configuring Nginx HTTPS..."
cd "$APP_DIR"
npm install
npm run build || {
    echo "Retrying build with clean node_modules cache..."
    rm -rf node_modules package-lock.json
    npm install
    npm run build
}

# Ensure web server (www-data) can read static dist assets
chown -R ${ACTUAL_USER}:${ACTUAL_USER} "$APP_DIR/dist" 2>/dev/null || true
chmod o+x /home /home/* 2>/dev/null || true
chmod -R o+r "$APP_DIR/dist" 2>/dev/null || true

# Nginx virtual host with SSL/TLS termination and HTTP->HTTPS redirection
cat << EOF > /etc/nginx/sites-available/socflow
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ${SERVER_IP} _;
    return 301 https://\$host\$request_uri;
}

# HTTPS Primary Virtual Host
server {
    listen 443 ssl;
    server_name ${SERVER_IP} _;

    ssl_certificate $SSL_DIR/socflow.crt;
    ssl_certificate_key $SSL_DIR/socflow.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root $APP_DIR/dist;
    index index.html;

    # Serve React SPA with client-side routing fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

ln -sf /etc/nginx/sites-available/socflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# ------------------------------------------------------------------------------
# 9. Start Services & Run Health Checks
# ------------------------------------------------------------------------------
echo -e "\n\e[34m[7/7]\e[0m Starting Daemons & Running Comprehensive Health Checks..."
systemctl daemon-reload
systemctl enable redis-server && systemctl restart redis-server
systemctl enable socflow-backend && systemctl restart socflow-backend
systemctl enable socflow-engine && systemctl restart socflow-engine
systemctl enable nginx && systemctl restart nginx

# Allow daemons time to complete socket initialization
sleep 3

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

# Health Check: HTTP to HTTPS Redirect
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ || true)
if [ "$HTTP_REDIRECT" = "301" ]; then
    echo -e "[\e[32mOK\e[0m] HTTP Redirect: Port 80 redirects to HTTPS (HTTP 301)."
else
    echo -e "[\e[33mWARN\e[0m] HTTP Redirect returned HTTP ${HTTP_REDIRECT}."
fi

# Health Check: HTTPS Web Delivery (curl -k for self-signed)
HTTPS_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/ || true)
if [ "$HTTPS_STATUS" = "200" ]; then
    echo -e "[\e[32mOK\e[0m] HTTPS Web Delivery: Responding with HTTP 200 over TLS (Port 443)."
else
    echo -e "[\e[31mFAIL\e[0m] HTTPS Web Delivery: Returned HTTP ${HTTPS_STATUS}."
    CHECK_FAILED=1
fi

# Health Check: Redis Message Queue Ping
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "[\e[32mOK\e[0m] Message Queue: Redis responding (PONG)."
else
    echo -e "[\e[31mFAIL\e[0m] Message Queue: Redis connection failed."
    CHECK_FAILED=1
fi

# Health Check: MySQL Database Connectivity with auto-generated credentials
if mysql -u "${DB_USER}" -p"${DB_PASS}" -h 127.0.0.1 -e "USE ${DB_NAME}; SELECT 1;" &>/dev/null; then
    echo -e "[\e[32mOK\e[0m] Database: Authenticated with auto-generated credentials."
else
    echo -e "[\e[31mFAIL\e[0m] Database: MySQL connection failed for user '${DB_USER}'."
    CHECK_FAILED=1
fi

# Health Check: Backend Ingestion API Proxy over HTTPS
BACKEND_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/api/connection/verify || true)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "[\e[32mOK\e[0m] Backend API Proxy: Nginx -> Express API routing verified (HTTP 200)."
else
    echo -e "[\e[31mFAIL\e[0m] Backend API Proxy: Routing failed (HTTP ${BACKEND_STATUS})."
    CHECK_FAILED=1
fi

echo "=========================================================="

if [ "$CHECK_FAILED" -eq 0 ]; then
    echo -e "\e[32m✔ SOCflow Bare-Metal Production Deployment Completed Successfully!\e[0m"
    echo -e "Access the SOC Dashboard at: \e[36mhttps://${SERVER_IP}/\e[0m"
    echo -e "Credentials file generated at: \e[33m$APP_DIR/socflow_credentials.txt\e[0m"
    echo -e "\nDemo Web Portal Logins:"
    echo -e "  Manager: \e[33mmanager@socflow.local\e[0m / \e[32mSOCflow2026!\e[0m"
    echo -e "  Analyst: \e[33manalyst@socflow.local\e[0m / \e[32mSOCflow2026!\e[0m"
else
    echo -e "\e[31m✘ Deployment completed with warnings. Check logs above.\e[0m"
fi
echo "=========================================================="

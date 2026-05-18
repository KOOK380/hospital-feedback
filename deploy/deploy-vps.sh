#!/bin/bash
# =============================================================================
# Hospital Survey System - VPS Deployment Script
# =============================================================================
#
# RECOMMENDED VPS PROVIDERS (affordable):
# - Hetzner Cloud   → €3.29/month (2 vCPU, 2GB RAM) — BEST VALUE
# - DigitalOcean    → $4/month (512MB RAM) or $6/month (1GB RAM)
# - Vultr           → $2.50/month (512MB) or $5/month (1GB)
# - Linode/Akamai   → $5/month (1GB RAM)
# - Contabo         → €4.50/month (4 vCPU, 8GB RAM) — BEST SPECS
#
# USAGE:
#   1. SSH into your VPS as root
#   2. Upload this script or paste it
#   3. chmod +x deploy-vps.sh && ./deploy-vps.sh
#
# =============================================================================

set -e

# ---- Configuration (EDIT THESE) ----
DOMAIN="survey.yourhospital.com"
DB_ROOT_PASS="CHANGE_THIS_DB_ROOT_PASSWORD"
DB_NAME="hospital_survey"
DB_USER="survey_app"
DB_PASS="CHANGE_THIS_DB_PASSWORD"
JWT_SECRET="CHANGE_THIS_TO_A_RANDOM_64_CHAR_STRING"
APP_PORT=3000
ADMIN_EMAIL="admin@hospital.com"
ADMIN_PASSWORD="admin123"

echo "============================================="
echo "  Hospital Survey System - VPS Deployment"
echo "============================================="
echo ""

# ---- System Update ----
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# ---- Install Node.js 20 ----
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "✅ Node.js $(node -v) installed"

# ---- Install Bun (faster) ----
echo "📦 Installing Bun..."
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
echo "✅ Bun installed"

# ---- Install MySQL ----
echo "📦 Installing MySQL..."
DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# Secure MySQL
mysql -u root <<MYSQL_SCRIPT
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_ROOT_PASS}';
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT
echo "✅ MySQL installed and database created"

# ---- Install Nginx (Reverse Proxy) ----
echo "📦 Installing Nginx..."
apt-get install -y nginx
echo "✅ Nginx installed"

# ---- Install Certbot (SSL) ----
echo "📦 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx
echo "✅ Certbot installed"

# ---- Install PM2 (Process Manager) ----
echo "📦 Installing PM2..."
npm install -g pm2
echo "✅ PM2 installed"

# ---- Clone / Upload Project ----
APP_DIR="/var/www/hospital-survey"
echo "📂 Setting up project at ${APP_DIR}..."
mkdir -p ${APP_DIR}

# If you have git:
# git clone <your-repo-url> ${APP_DIR}
# cd ${APP_DIR}

echo "⚠️  Upload your project files to ${APP_DIR}"
echo "   Then re-run this script or continue manually."
echo ""
echo "   Quick upload from local machine:"
echo "   rsync -avz --exclude node_modules --exclude .next ./ root@YOUR_VPS_IP:${APP_DIR}/"
echo ""

cd ${APP_DIR} || { echo "❌ Project directory not found!"; exit 1; }

# ---- Install Dependencies ----
echo "📦 Installing project dependencies..."
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi
echo "✅ Dependencies installed"

# ---- Environment Setup ----
echo "⚙️  Creating production environment..."
cat > .env.production <<EOF
# Database - MySQL (Production)
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"

# JWT Authentication
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN=7d

# App Configuration
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NODE_ENV=production
PORT=${APP_PORT}

# Upload Directory
UPLOAD_DIR="public/uploads"
EOF

# Also create .env for Prisma
cp .env.production .env
echo "✅ Environment configured"

# ---- Switch to MySQL Schema ----
echo "⚙️  Switching to MySQL schema..."
if [ -f "prisma/schema.mysql.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.sqlite.bak
    cp prisma/schema.mysql.prisma prisma/schema.prisma
    echo "✅ Switched to MySQL schema"
fi

# ---- Generate Prisma Client ----
echo "⚙️  Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"

# ---- Build Application ----
echo "🔨 Building application..."
if command -v bun &> /dev/null; then
    bun run build
else
    npm run build
fi
echo "✅ Build complete"

# ---- Push Database Schema ----
echo "🗄️  Pushing database schema..."
npx prisma db push
echo "✅ Database schema created"

# ---- Seed Database ----
echo "🌱 Seeding database..."
if command -v bun &> /dev/null; then
    bun run db:seed
else
    npx prisma db seed
fi
echo "✅ Database seeded"

# ---- Create Upload Directory ----
mkdir -p public/uploads
chmod 755 public/uploads

# ---- Configure PM2 ----
echo "🚀 Starting application with PM2..."
pm2 delete hospital-survey 2>/dev/null || true
NODE_ENV=production pm2 start .next/standalone/server.js --name hospital-survey -- --port ${APP_PORT}
pm2 save
pm2 startup systemd -u root --hp /root
echo "✅ Application started"

# ---- Configure Nginx ----
echo "🌐 Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/${DOMAIN} <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone \$binary_remote_addr zone=general:10m rate=60r/m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # Static files with caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Upload files
    location /uploads/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        expires 30d;
        add_header Cache-Control "public";
    }

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # All other requests
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Max upload size
    client_max_body_size 10M;
}
EOF

ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
echo "✅ Nginx configured"

# ---- Firewall ----
echo "🔒 Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "✅ Firewall configured (ports 22, 80, 443 open)"

# ---- SSL Certificate ----
echo ""
echo "🔐 SSL Setup:"
echo "   To install free SSL certificate, run:"
echo "   certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "   Make sure your domain DNS points to this server first!"
echo "   A record: ${DOMAIN} → YOUR_VPS_IP"

# ---- Final Summary ----
echo ""
echo "============================================="
echo "  ✅ VPS DEPLOYMENT COMPLETE!"
echo "============================================="
echo ""
echo "Application: http://${DOMAIN}"
echo "Admin Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
echo ""
echo "USEFUL COMMANDS:"
echo "  pm2 status                    - Check app status"
echo "  pm2 logs hospital-survey      - View application logs"
echo "  pm2 restart hospital-survey   - Restart application"
echo "  pm2 monit                     - Monitor resources"
echo "  nginx -t && systemctl restart nginx  - Restart Nginx"
echo "  certbot renew                 - Renew SSL certificate"
echo ""
echo "AUTO-RESTART ON REBOOT:"
echo "  PM2 is configured with startup script."
echo "  The app will auto-start on server reboot."

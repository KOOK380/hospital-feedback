#!/bin/bash
# =============================================================================
# Hospital Survey System - Shared Hosting Deployment Script (cPanel + Node.js)
# =============================================================================
#
# PREREQUISITES:
# 1. Shared hosting with cPanel that supports Node.js (v18+)
#    - Hostinger, A2 Hosting, Namecheap Business, InMotion Hosting, etc.
# 2. MySQL database created via cPanel
# 3. SSH access or cPanel Terminal access
# 4. Domain name pointed to hosting
#
# IMPORTANT: Traditional shared hosting (PHP only) will NOT work!
# Your host MUST support Node.js applications.
#
# USAGE:
#   chmod +x deploy-shared-hosting.sh
#   ./deploy-shared-hosting.sh
# =============================================================================

set -e

echo "============================================="
echo "  Hospital Survey System - Shared Hosting"
echo "  Deployment Script"
echo "============================================="
echo ""

# ---- Configuration (EDIT THESE) ----
APP_NAME="hospital-survey"
APP_PORT=3000
NODE_VERSION=18
DOMAIN="yourdomain.com"

# MySQL Database (from cPanel)
DB_HOST="localhost"
DB_PORT=3306
DB_NAME="youruser_hospital_survey"
DB_USER="youruser_survey_admin"
DB_PASS="CHANGE_THIS_PASSWORD"

# JWT Secret (generate a strong one!)
JWT_SECRET="CHANGE_THIS_TO_A_RANDOM_64_CHAR_STRING"

# Upload directory
UPLOAD_DIR="public/uploads"

echo "Step 1: Checking Node.js availability..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is NOT installed!"
    echo ""
    echo "If using cPanel:"
    echo "  1. Go to 'Software' > 'Setup Node.js App'"
    echo "  2. Create a new Node.js application"
    echo "  3. Select Node.js version ${NODE_VERSION}+"
    echo "  4. Set application root to your project directory"
    echo "  5. Set application URL to your domain"
    echo ""
    echo "If Node.js is not available, your hosting does NOT support"
    echo "this application. Consider upgrading to a VPS."
    exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "❌ Node.js version must be 18+. Current: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

echo ""
echo "Step 2: Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install --production
elif command -v npm &> /dev/null; then
    npm ci --production
else
    echo "❌ Neither bun nor npm found!"
    exit 1
fi
echo "✅ Dependencies installed"

echo ""
echo "Step 3: Setting up environment..."
cat > .env.production <<EOF
# Database - MySQL (Production)
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# JWT Authentication
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN=7d

# App Configuration
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NODE_ENV=production
PORT=${APP_PORT}

# Upload Directory
UPLOAD_DIR="${UPLOAD_DIR}"
EOF

echo "✅ .env.production created"

echo ""
echo "Step 4: Switching to MySQL schema..."
if [ -f "prisma/schema.mysql.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.sqlite.prisma.bak
    cp prisma/schema.mysql.prisma prisma/schema.prisma
    echo "✅ Switched to MySQL schema"
else
    echo "⚠️  MySQL schema not found, using current schema"
fi

echo ""
echo "Step 5: Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"

echo ""
echo "Step 6: Building the application..."
if command -v bun &> /dev/null; then
    bun run build
else
    npm run build
fi
echo "✅ Build complete"

echo ""
echo "Step 7: Pushing database schema..."
npx prisma db push
echo "✅ Database schema pushed"

echo ""
echo "Step 8: Seeding database..."
if command -v bun &> /dev/null; then
    bun run db:seed
else
    npx prisma db seed
fi
echo "✅ Database seeded"

echo ""
echo "Step 9: Setting up process manager..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

pm2 delete ${APP_NAME} 2>/dev/null || true
pm2 start .next/standalone/server.js --name ${APP_NAME} -- --port ${APP_PORT}
pm2 save
pm2 startup
echo "✅ Process manager configured"

echo ""
echo "Step 10: Setting up uploads directory..."
mkdir -p ${UPLOAD_DIR}
chmod 755 ${UPLOAD_DIR}
echo "✅ Uploads directory ready"

echo ""
echo "============================================="
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "============================================="
echo ""
echo "Your application should be running at:"
echo "  → http://${DOMAIN}:${APP_PORT}"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "  1. Set up SSL via cPanel (Let's Encrypt)"
echo "  2. Configure Apache reverse proxy (see below)"
echo "  3. Change default admin password after first login"
echo ""
echo "APACHE REVERSE PROXY (.htaccess):"
echo "  Add this to your .htaccess file to route"
echo "  traffic from port 80/443 to your Node.js app:"
echo ""
cat <<'HTACCESS'
# Add to public_html/.htaccess
RewriteEngine On
RewriteRule ^$ http://127.0.0.1:3000/ [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
HTACCESS
echo ""
echo "USEFUL COMMANDS:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs ${APP_NAME}  - View logs"
echo "  pm2 restart ${APP_NAME} - Restart app"
echo "  pm2 stop ${APP_NAME}    - Stop app"

#!/bin/bash
# deploy.sh — run on the VPS after pulling new code
# Usage: bash scripts/deploy.sh
set -e

echo "==> Pulling latest code..."
git pull origin master

echo "==> Installing dependencies..."
npm install

echo "==> Generating Prisma client..."
cd packages/database && npx prisma generate && cd ../..

echo "==> Running database migrations..."
cd packages/database && npx prisma migrate deploy && cd ../..

echo "==> Building worker..."
cd apps/worker && npx tsc && cd ../..

echo "==> Building web app..."
cd apps/web && npx next build && cd ../..

echo "==> Restarting PM2 processes..."
pm2 reload ecosystem.config.js --env production

echo "==> Done. Status:"
pm2 status

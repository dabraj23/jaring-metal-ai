#!/bin/bash

# ============================================================
# Jaring Metal AI - Quotation Intelligence Platform
# Startup Script
# ============================================================

echo ""
echo "  ⬡  Jaring Metal AI - Quotation Intelligence Platform"
echo "  ─────────────────────────────────────────────────────"
echo ""

# Navigate to backend
cd "$(dirname "$0")/backend"

# Check if port 3001 is already in use
if lsof -i:3001 > /dev/null 2>&1; then
  echo "  ℹ  Server already running on port 3001"
  echo ""
  echo "  Open your browser and go to:"
  echo "  👉  http://localhost:3001"
  echo ""
  echo "  Demo Login Credentials:"
  echo "  ─────────────────────────────────────────"
  echo "  Admin:      admin@jaringmetal.com / admin123"
  echo "  Commercial: commercial@jaringmetal.com / pass123"
  echo "  Pricing:    pricing@jaringmetal.com / pass123"
  echo "  Approver:   approver@jaringmetal.com / pass123"
  echo "  Finance:    finance@jaringmetal.com / pass123"
  echo ""
  exit 0
fi

echo "  Starting server..."
PORT=3001 node server.js &
SERVER_PID=$!

sleep 3

echo ""
echo "  ✅  Server started successfully!"
echo ""
echo "  Open your browser and go to:"
echo "  👉  http://localhost:3001"
echo ""
echo "  Demo Login Credentials:"
echo "  ─────────────────────────────────────────"
echo "  Admin:      admin@jaringmetal.com / admin123"
echo "  Commercial: commercial@jaringmetal.com / pass123"
echo "  Pricing:    pricing@jaringmetal.com / pass123"
echo "  Approver:   approver@jaringmetal.com / pass123"
echo "  Finance:    finance@jaringmetal.com / pass123"
echo ""
echo "  Demo Quotations:"
echo "  ─────────────────────────────────────────"
echo "  JM-2024-0001 - Released (complete example)"
echo "  JM-2024-0002 - Pending Approval"
echo "  JM-2024-0003 - Extracted (ready for review)"
echo "  JM-2024-0004 - Draft (forward pricing)"
echo ""
echo "  Press Ctrl+C to stop the server"
echo ""

wait $SERVER_PID

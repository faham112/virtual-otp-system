#!/usr/bin/env bash
# ============================================================
# Virtual OTP System - Start Frontend + Backend
# Usage:  bash start.sh   (LOCAL only)
#
# Railway: Do NOT use this script.
# Backend Start Command must be:
#   uvicorn app.main:app --host 0.0.0.0 --port $PORT
# Root Directory must be: backend
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ---------- Railway detection ----------
# If someone accidentally set Start Command to bash start.sh on Railway,
# run only the backend with system Python (no venv).
if [ -n "$RAILWAY_ENVIRONMENT" ] || [ -n "$RAILWAY_SERVICE_NAME" ] || [ -n "$RAILWAY_PROJECT_ID" ]; then
  echo -e "${YELLOW}[Railway detected] Running backend only (no local venv)...${NC}"
  cd "$ROOT_DIR/backend" 2>/dev/null || cd "$ROOT_DIR"
  exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping services...${NC}"
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  echo -e "${GREEN}Stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}"
echo "=============================================="
echo "   Virtual OTP System - Starting..."
echo "=============================================="
echo -e "${NC}"

# ---------- Checks (local only) ----------
if [ ! -f "backend/requirements.txt" ]; then
  echo -e "${RED}backend/ not found. Run from project root.${NC}"
  exit 1
fi

if [ ! -d "backend/venv" ]; then
  echo -e "${RED}Backend venv missing. Pehle chalao: bash install.sh${NC}"
  exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
  echo -e "${RED}Frontend node_modules missing. Pehle chalao: bash install.sh${NC}"
  exit 1
fi

if [ ! -f "backend/.env" ]; then
  echo -e "${YELLOW}Warning: backend/.env not found.${NC}"
  echo -e "${YELLOW}Pehle setup karo: bash setup.sh${NC}"
  echo ""
fi

# ---------- Start Backend ----------
echo -e "${YELLOW}[1/2] Starting Backend (port 8000)...${NC}"
cd "$ROOT_DIR/backend"
# shellcheck disable=SC1091
source venv/bin/activate

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 2

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo -e "${RED}Backend start failed.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend running  →  http://localhost:8000${NC}"
echo -e "${GREEN}  API docs         →  http://localhost:8000/docs${NC}"

# ---------- Start Frontend ----------
echo ""
echo -e "${YELLOW}[2/2] Starting Frontend (port 3000)...${NC}"
cd "$ROOT_DIR/frontend"

npm run dev -- --hostname 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

sleep 3

if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  echo -e "${RED}Frontend start failed.${NC}"
  cleanup
  exit 1
fi
echo -e "${GREEN}✓ Frontend running →  http://localhost:3000${NC}"

# ---------- Ready ----------
echo ""
echo -e "${BLUE}=============================================="
echo "  SYSTEM READY"
echo "==============================================${NC}"
echo ""
echo -e "  Frontend : ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend  : ${GREEN}http://localhost:8000${NC}"
echo -e "  Admin    : ${GREEN}http://localhost:3000/admin${NC}"
echo ""
echo -e "${YELLOW}Stop karne ke liye:  Ctrl + C${NC}"
echo ""

wait

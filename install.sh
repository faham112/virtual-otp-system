#!/usr/bin/env bash
# ============================================================
# Virtual OTP System - Install All Packages
# Usage:  bash install.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo -e "${BLUE}"
echo "=============================================="
echo "   Virtual OTP System - Installing Packages"
echo "=============================================="
echo -e "${NC}"

# ---------- Check Python ----------
if ! command -v python3 &>/dev/null; then
  echo -e "${RED}python3 not found. Install Python 3 first.${NC}"
  exit 1
fi

# ---------- Check Node ----------
if ! command -v node &>/dev/null; then
  echo -e "${RED}node not found. Install Node.js first.${NC}"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo -e "${RED}npm not found. Install Node.js/npm first.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Python: $(python3 --version)${NC}"
echo -e "${GREEN}✓ Node:   $(node --version)${NC}"
echo -e "${GREEN}✓ npm:    $(npm --version)${NC}"
echo ""

# ---------- Backend ----------
echo -e "${YELLOW}[1/2] Backend packages installing...${NC}"
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
  echo "Creating Python virtualenv..."
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

pip install --upgrade pip -q
pip install -r requirements.txt

echo -e "${GREEN}✓ Backend packages installed${NC}"
deactivate

# ---------- Frontend ----------
echo ""
echo -e "${YELLOW}[2/2] Frontend packages installing...${NC}"
cd "$ROOT_DIR/frontend"
npm install

echo -e "${GREEN}✓ Frontend packages installed${NC}"

# ---------- Done ----------
echo ""
echo -e "${BLUE}=============================================="
echo "  INSTALL COMPLETE"
echo "==============================================${NC}"
echo ""
echo "Next step - start both services:"
echo -e "  ${GREEN}bash start.sh${NC}"
echo ""
echo "(Agar pehli baar setup hai to pehle: bash setup.sh)"
echo ""

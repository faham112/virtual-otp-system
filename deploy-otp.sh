#!/usr/bin/env bash
set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${OTP_VPS_HOST:-}"
REMOTE_USER="${OTP_VPS_USER:-}"
REMOTE_PATH="${OTP_REMOTE_PATH:-/var/www/html/virtual-otp-system}"
REMOTE_BRANCH="${OTP_BRANCH:-main}"
COMMIT_MESSAGE="${1:-Deploy production}"

say() { printf '%b\n' "$1"; }
fail() { say "${RED}ERROR: $1${NC}" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: OTP_VPS_HOST=server OTP_VPS_USER=user bash deploy-otp.sh [commit message]

The command commits local changes, pushes ${REMOTE_BRANCH}, then updates the VPS.
Set OTP_SKIP_PUSH=1 to deploy the current remote branch without committing/pushing.
EOF
}

[[ "${1:-}" != "--help" ]] || { usage; exit 0; }
command -v git >/dev/null || fail "git is required."
command -v ssh >/dev/null || fail "ssh is required."
[[ -n "$REMOTE_HOST" ]] || fail "Set OTP_VPS_HOST to the VPS hostname or IP."
[[ -n "$REMOTE_USER" ]] || fail "Set OTP_VPS_USER to the VPS SSH user."

cd "$ROOT_DIR"
[[ -f backend/requirements.txt && -f frontend/package.json ]] || fail "Run this command from the OTP project root."

if [[ "${OTP_SKIP_PUSH:-0}" != "1" ]]; then
  say "${BLUE}==> Preparing production release${NC}"
  git diff --check
  if [[ -n "$(git status --porcelain)" ]]; then
    say "${YELLOW}==> Committing local changes: ${COMMIT_MESSAGE}${NC}"
    git add -A
    git commit -m "$COMMIT_MESSAGE"
  else
    say "${GREEN}==> No local changes to commit${NC}"
  fi
  say "${YELLOW}==> Pushing ${REMOTE_BRANCH} to origin${NC}"
  git push origin "$REMOTE_BRANCH"
else
  say "${YELLOW}==> Push skipped; deploying the remote ${REMOTE_BRANCH} branch${NC}"
fi

say "${BLUE}==> Updating ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}${NC}"
ssh "$REMOTE_USER@$REMOTE_HOST" "OTP_REMOTE_PATH='$REMOTE_PATH' OTP_BRANCH='$REMOTE_BRANCH' bash -s" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
say() { printf '%b\n' "$1"; }
fail() { say "${RED}ERROR: $1${NC}" >&2; exit 1; }

cd "$OTP_REMOTE_PATH"
[[ -d .git ]] || fail "${OTP_REMOTE_PATH} is not a git checkout."
say "${YELLOW}==> Pulling ${OTP_BRANCH}${NC}"
git fetch origin "$OTP_BRANCH"
git checkout "$OTP_BRANCH"
git reset --hard "origin/$OTP_BRANCH"

[[ -f backend/.env ]] || fail "backend/.env is missing on the server."
[[ -f frontend/.env.production ]] || fail "frontend/.env.production is missing on the server."
command -v python3 >/dev/null || fail "python3 is required on the server."
command -v npm >/dev/null || fail "npm is required on the server."

say "${YELLOW}==> Installing backend dependencies${NC}"
python3 -m venv backend/venv 2>/dev/null || true
backend/venv/bin/python -m pip install --upgrade pip -q
backend/venv/bin/pip install -r backend/requirements.txt

say "${YELLOW}==> Installing and building frontend${NC}"
cd frontend
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run build
cd ..

if command -v nginx >/dev/null; then
  say "${YELLOW}==> Validating Nginx${NC}"
  sudo nginx -t
fi

say "${YELLOW}==> Restarting production services${NC}"
sudo systemctl daemon-reload
sudo systemctl restart otp-backend.service otp-frontend.service
sudo systemctl is-active --quiet otp-backend.service || fail "Backend service is not active."
sudo systemctl is-active --quiet otp-frontend.service || fail "Frontend service is not active."

say "${YELLOW}==> Checking local health endpoints${NC}"
curl --fail --silent --show-error http://127.0.0.1:8000/health >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
if command -v nginx >/dev/null; then sudo systemctl reload nginx; fi
say "${GREEN}==> Production deployment completed successfully${NC}"
REMOTE_SCRIPT

say "${GREEN}Live site: https://otp.globalcareerhub.org${NC}"
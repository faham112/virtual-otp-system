#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="/var/www/html/virtual-otp-system"
BRANCH="${OTP_BRANCH:-main}"
VENV="${REPO_DIR}/backend/venv"
FRONTEND_URL="${OTP_URL:-https://otp.globalcareerhub.org/}"
BACKUP_DIR="${HOME}/.otp-keep"

log() { printf '[deploy-otp] %s\n' "$*"; }
fail() { printf '[deploy-otp] ERROR: %s\n' "$*" >&2; exit 1; }

keep_copy() {
    local src="$1"
    local dest="$2"
    if [[ -f "$src" ]]; then
        mkdir -p "$(dirname "$dest")"
        cp -a "$src" "$dest"
    fi
}

keep_restore() {
    local dest="$1"
    local src="$2"
    if [[ ! -f "$dest" && -f "$src" ]]; then
        mkdir -p "$(dirname "$dest")"
        cp -a "$src" "$dest"
        log "Restored $dest from backup"
    fi
}

echo "========================================"
echo " OTP production deployment"
echo "========================================"

[[ "$(id -u)" -ne 0 ]] || fail "Run as the SSH user, not with sudo."
[[ -d "$REPO_DIR/.git" ]] || fail "Repository not found at $REPO_DIR."
command -v git >/dev/null || fail "git is required."
command -v curl >/dev/null || fail "curl is required."
command -v python3 >/dev/null || fail "python3 is required."
command -v npm >/dev/null || fail "npm is required."
command -v sudo >/dev/null || fail "sudo is required."

cd "$REPO_DIR"
mkdir -p "$BACKUP_DIR"

log "Saving production secrets and uploads"
keep_copy "backend/.env" "$BACKUP_DIR/backend.env"
keep_copy "frontend/.env.production" "$BACKUP_DIR/frontend.env.production"
keep_copy "frontend/.env.local" "$BACKUP_DIR/frontend.env.local"
if [[ -d backend/uploads ]]; then
    mkdir -p "$BACKUP_DIR/uploads"
    cp -a backend/uploads/. "$BACKUP_DIR/uploads/" 2>/dev/null || true
fi

log "Cleaning local junk (secrets and uploads stay)"
git fetch origin "$BRANCH"
git reset --hard "origin/${BRANCH}"
git clean -fd \
    -e backend/.env \
    -e frontend/.env.production \
    -e frontend/.env.local \
    -e backend/uploads \
    -e backend/venv \
    -e frontend/node_modules \
    -e frontend/.next \
    || true

keep_restore "backend/.env" "$BACKUP_DIR/backend.env"
keep_restore "frontend/.env.production" "$BACKUP_DIR/frontend.env.production"
keep_restore "frontend/.env.local" "$BACKUP_DIR/frontend.env.local"
if [[ -d "$BACKUP_DIR/uploads" ]]; then
    mkdir -p backend/uploads
    cp -a "$BACKUP_DIR/uploads/." backend/uploads/ 2>/dev/null || true
fi

log "Latest commit: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

[[ -f backend/.env ]] || fail "backend/.env is missing. Put secrets in $BACKUP_DIR/backend.env or backend/.env"
[[ -f frontend/.env.production ]] || fail "frontend/.env.production is missing."

if [[ ! -x "${VENV}/bin/python" ]]; then
    log "Creating Python virtual environment"
    python3 -m venv "$VENV"
fi

log "Installing backend requirements"
"${VENV}/bin/python" -m pip install --quiet --upgrade pip
"${VENV}/bin/python" -m pip install --quiet -r backend/requirements.txt
"${VENV}/bin/python" -m pip check

log "Installing frontend requirements"
if [[ -f frontend/package-lock.json ]]; then
    npm --prefix frontend ci --no-audit --no-fund
else
    npm --prefix frontend install --no-audit --no-fund
fi

log "Applying database schema and seed data"
(
    cd backend
    "$VENV/bin/python" - <<'PY'
from app.database import Base, engine
from app.seed import seed_database
Base.metadata.create_all(bind=engine)
try:
    from app.migrate import run_migrations
    run_migrations()
except Exception as e:
    print("[deploy-otp] migrate skipped:", e)
seed_database()
print("[deploy-otp] schema + seed ok")
PY
)

log "Building production frontend"
rm -rf frontend/.next
npm --prefix frontend run build

log "Installing OTP service definitions"
sudo -n tee /etc/systemd/system/otp-backend.service >/dev/null <<EOF
[Unit]
Description=Virtual OTP Backend
After=network.target postgresql.service

[Service]
Type=simple
User=$(id -un)
Group=$(id -gn)
WorkingDirectory=$REPO_DIR/backend
Environment=PATH=$VENV/bin
ExecStart=$VENV/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo -n tee /etc/systemd/system/otp-frontend.service >/dev/null <<EOF
[Unit]
Description=Virtual OTP Frontend
After=network.target otp-backend.service

[Service]
Type=simple
User=$(id -un)
Group=$(id -gn)
WorkingDirectory=$REPO_DIR/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

log "Restarting services"
sudo -n systemctl daemon-reload
sudo -n systemctl enable --now otp-backend.service otp-frontend.service
sudo -n systemctl restart otp-backend.service otp-frontend.service

log "Reloading Nginx"
sudo -n nginx -t
sudo -n systemctl reload nginx

log "Health checks"
for attempt in {1..20}; do
    if curl --fail --silent http://127.0.0.1:8000/health >/dev/null && \
       curl --fail --silent "$FRONTEND_URL" >/dev/null; then
        echo ""
        echo "========================================"
        echo " OTP deployment successful"
        echo " Commit:   $(git rev-parse --short HEAD)"
        echo " Frontend: https://otp.globalcareerhub.org/"
        echo " Admin:    https://otp.globalcareerhub.org/admin"
        echo " Backend:  http://127.0.0.1:8000/health"
        echo "========================================"
        log "Deployment complete"
        exit 0
    fi
    sleep 1
done

printf 'Health checks failed. Inspect: sudo journalctl -u otp-backend -u otp-frontend -n 100\n' >&2
fail "Deployment health checks failed."

# Virtual OTP System — Full Linux VPS / RDP Setup Guide (A → Z)

Yeh guide **Ubuntu 22.04 / 24.04** (ya Debian) VPS / RDP ke liye hai.  
Iske baad project **IP** ya **domain** pe fully live chalega: Frontend + Backend + PostgreSQL + Nginx.

---

## Architecture (final)

```
Internet
   │
   ▼
 Nginx (80 / 443)
   ├── yourdomain.com        → Frontend (Next.js on 127.0.0.1:3000)
   └── yourdomain.com/api    → Backend  (FastAPI on 127.0.0.1:8000)
                                    │
                                    ▼
                              PostgreSQL (localhost:5432)
```

**Suggested paths on server:**

| Item | Path |
|------|------|
| Project source | `/var/www/virtual-otp-system` |
| Backend venv | `/var/www/virtual-otp-system/backend/venv` |
| Frontend app | `/var/www/virtual-otp-system/frontend` |
| Backend .env | `/var/www/virtual-otp-system/backend/.env` |
| Frontend env | `/var/www/virtual-otp-system/frontend/.env.production` |
| Systemd services | `/etc/systemd/system/otp-backend.service` , `otp-frontend.service` |
| Nginx site | `/etc/nginx/sites-available/virtual-otp` |

Replace `yourdomain.com` aur `YOUR_SERVER_IP` apni values se.

---

## 0. Server prepare (first login)

```bash
sudo apt update && sudo apt upgrade -y

# Basic tools
sudo apt install -y git curl wget ufw build-essential \
  python3 python3-venv python3-pip \
  nginx postgresql postgresql-contrib \
  certbot python3-certbot-nginx

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 1. Clone project into VPS / RDP

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/faham112/virtual-otp-system.git
sudo chown -R $USER:$USER /var/www/virtual-otp-system
cd /var/www/virtual-otp-system

# Latest code
git pull origin main
```

Private repo ho to SSH key ya personal access token use karo:

```bash
git clone https://<TOKEN>@github.com/faham112/virtual-otp-system.git
```

---

## 2. Install Node.js 20 (frontend build ke liye)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

---

## 3. PostgreSQL setup

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create DB user + database
sudo -u postgres psql <<'EOF'
CREATE USER otpuser WITH PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';
CREATE DATABASE virtual_otp OWNER otpuser;
GRANT ALL PRIVILEGES ON DATABASE virtual_otp TO otpuser;
\q
EOF
```

PostgreSQL 15+ pe schema access bhi do:

```bash
sudo -u postgres psql -d virtual_otp -c "GRANT ALL ON SCHEMA public TO otpuser;"
```

**Connection string (backend ke liye):**

```text
postgresql://otpuser:CHANGE_THIS_STRONG_PASSWORD@127.0.0.1:5432/virtual_otp
```

Test:

```bash
psql "postgresql://otpuser:CHANGE_THIS_STRONG_PASSWORD@127.0.0.1:5432/virtual_otp" -c "SELECT 1;"
```

---

## 4. Backend environment + packages

```bash
cd /var/www/virtual-otp-system/backend

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Create `backend/.env`

```bash
nano /var/www/virtual-otp-system/backend/.env
```

Paste (values replace karo):

```env
DATABASE_URL=postgresql://otpuser:CHANGE_THIS_STRONG_PASSWORD@127.0.0.1:5432/virtual_otp

SECRET_KEY=PASTE_LONG_RANDOM_64_CHAR_SECRET_HERE
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

FIVESIM_API_KEY=your_real_5sim_api_key

DEFAULT_MARKUP_PERCENT=50

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=Admin@Secure123!

# Domain use kar rahe ho to:
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com

# Sirf IP se test karna ho to (example):
# CORS_ORIGINS=http://YOUR_SERVER_IP,http://127.0.0.1:3000
```

Random `SECRET_KEY` generate:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Permissions:

```bash
chmod 600 /var/www/virtual-otp-system/backend/.env
```

---

## 5. Frontend environment + install + **build**

### Production env (build time pe use hota hai)

```bash
cd /var/www/virtual-otp-system/frontend

nano .env.production
```

**Domain mode:**

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

**IP-only mode (no domain yet):**

```env
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP
```

> Note: `/api` Nginx se backend pe proxy hoga, is liye `NEXT_PUBLIC_API_URL` domain/IP root rakhna best hai (neeche Nginx config dekho).

### Install + build

```bash
cd /var/www/virtual-otp-system/frontend
npm install
npm run build
```

Build success ke baad `.next` folder ban jata hai — yahi production serve hota hai.

---

## 6. Systemd services (auto-start backend + frontend)

### Backend service

```bash
sudo nano /etc/systemd/system/otp-backend.service
```

```ini
[Unit]
Description=Virtual OTP Backend (FastAPI)
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/virtual-otp-system/backend
Environment="PATH=/var/www/virtual-otp-system/backend/venv/bin"
ExecStart=/var/www/virtual-otp-system/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### Frontend service

```bash
sudo nano /etc/systemd/system/otp-frontend.service
```

```ini
[Unit]
Description=Virtual OTP Frontend (Next.js)
After=network.target otp-backend.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/virtual-otp-system/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### Permissions + start

```bash
# www-data ko project access
sudo chown -R www-data:www-data /var/www/virtual-otp-system

sudo systemctl daemon-reload
sudo systemctl enable otp-backend otp-frontend
sudo systemctl start otp-backend
sudo systemctl start otp-frontend

# Status check
sudo systemctl status otp-backend --no-pager
sudo systemctl status otp-frontend --no-pager

# Logs
sudo journalctl -u otp-backend -f
# Ctrl+C to exit
sudo journalctl -u otp-frontend -n 50 --no-pager
```

Backend seed (tables + admin) **pehli start** pe auto chalta hai.

Local test (server pe):

```bash
curl -s http://127.0.0.1:8000/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
```

---

## 7. Nginx — reverse proxy (IP + domain)

### Site config

```bash
sudo nano /etc/nginx/sites-available/virtual-otp
```

```nginx
# Upstream backends (local only)
upstream otp_api {
    server 127.0.0.1:8000;
}

upstream otp_web {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;

    # Domain:
    server_name yourdomain.com www.yourdomain.com;

    # Agar abhi sirf IP use kar rahe ho:
    # server_name YOUR_SERVER_IP;

    client_max_body_size 10M;

    # ----- API (FastAPI) -----
    location /api/ {
        proxy_pass http://otp_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Optional: docs / health directly
    location /docs {
        proxy_pass http://otp_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /openapi.json {
        proxy_pass http://otp_api;
        proxy_set_header Host $host;
    }

    location /health {
        proxy_pass http://otp_api;
        proxy_set_header Host $host;
    }

    # ----- Frontend (Next.js) -----
    location / {
        proxy_pass http://otp_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -sf /etc/nginx/sites-available/virtual-otp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Important: Frontend API URL vs Nginx

Is config mein:

- Browser → `https://yourdomain.com` → Next.js
- Browser → `https://yourdomain.com/api/...` → FastAPI

Is liye frontend `.env.production` mein:

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

Phir **rebuild** zaroori hai (env build-time embed hota hai):

```bash
cd /var/www/virtual-otp-system/frontend
sudo -u www-data npm run build
# ya agar ownership issue ho:
sudo chown -R $USER:$USER /var/www/virtual-otp-system/frontend
npm run build
sudo chown -R www-data:www-data /var/www/virtual-otp-system
sudo systemctl restart otp-frontend
```

Backend CORS bhi domain se match kare:

```env
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com
```

```bash
sudo systemctl restart otp-backend
```

---

## 8. Domain DNS setup

Apne domain registrar (Namecheap, Cloudflare, GoDaddy, etc.) pe:

| Type | Name | Value |
|------|------|--------|
| A | `@` | `YOUR_SERVER_IP` |
| A | `www` | `YOUR_SERVER_IP` |

DNS propagate hone ka wait (5 min – 24 hr). Check:

```bash
ping yourdomain.com
# ya
dig +short yourdomain.com
```

---

## 9. SSL (HTTPS) with Let's Encrypt

Domain DNS point hone ke baad:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts (email, agree). Certbot Nginx config auto update karega.

Auto-renew test:

```bash
sudo certbot renew --dry-run
```

HTTPS ke baad CORS + frontend env **https** rakho, phir frontend rebuild + services restart.

---

## 10. Launch checklist (end-to-end)

```bash
# 1) Services
sudo systemctl status otp-backend otp-frontend nginx postgresql --no-pager

# 2) Local ports
ss -tlnp | grep -E ':80|:443|:3000|:8000|:5432'

# 3) API health
curl -s http://127.0.0.1:8000/health
curl -s https://yourdomain.com/health

# 4) Website
curl -I https://yourdomain.com
```

Browser:

1. Open `https://yourdomain.com`
2. Login admin (`ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`)
3. Dashboard → **Admin Panel** (purple button)
4. Settings → markup set
5. Users → add balance
6. Buy Number → live price/stock

---

## 11. Update code later (deploy new GitHub changes)

```bash
cd /var/www/virtual-otp-system
sudo chown -R $USER:$USER .
git pull origin main

# Backend deps (agar requirements change)
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Frontend rebuild
cd ../frontend
npm install
npm run build

# Permissions + restart
cd /var/www/virtual-otp-system
sudo chown -R www-data:www-data .
sudo systemctl restart otp-backend otp-frontend
sudo systemctl reload nginx
```

---

## 12. Optional: IP-only launch (no domain)

1. Nginx `server_name YOUR_SERVER_IP;`
2. `frontend/.env.production` → `NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP`
3. `backend/.env` → `CORS_ORIGINS=http://YOUR_SERVER_IP`
4. Rebuild frontend + restart backend/frontend/nginx
5. Open `http://YOUR_SERVER_IP`

SSL IP pe Let's Encrypt free nahi milta — domain chahiye HTTPS ke liye.

---

## 13. Troubleshooting

### Backend 502 / not starting

```bash
sudo journalctl -u otp-backend -n 100 --no-pager
# Common: wrong DATABASE_URL, missing FIVESIM_API_KEY, SECRET_KEY too short
```

### Frontend blank / old build

```bash
cd /var/www/virtual-otp-system/frontend
npm run build
sudo systemctl restart otp-frontend
```

### CORS errors in browser

- `CORS_ORIGINS` mein exact frontend origin (scheme + host)
- `NEXT_PUBLIC_API_URL` rebuild ke baad match kare
- HTTPS site pe HTTP API mat rakho

### Database connection refused

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\\l"
```

### Permission denied (www-data)

```bash
sudo chown -R www-data:www-data /var/www/virtual-otp-system
sudo chmod 600 /var/www/virtual-otp-system/backend/.env
```

### Nginx test fail

```bash
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
```

---

## 14. Security notes (production)

1. Strong `ADMIN_PASSWORD` + `SECRET_KEY` + DB password
2. `.env` file `chmod 600`, git mein commit mat karo
3. UFW: sirf 22, 80, 443 open
4. PostgreSQL bahar expose mat karo (`listen_addresses = 'localhost'`)
5. Backend/Frontend sirf `127.0.0.1` pe bind — public pe Nginx
6. Regular: `sudo apt update && sudo apt upgrade`

---

## Quick command summary

```bash
# Clone
cd /var/www && git clone https://github.com/faham112/virtual-otp-system.git

# DB
sudo -u postgres psql   # create user + DB

# Backend
cd /var/www/virtual-otp-system/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# edit .env

# Frontend
cd /var/www/virtual-otp-system/frontend
# edit .env.production
npm install && npm run build

# Services + Nginx (configs above)
sudo systemctl enable --now otp-backend otp-frontend nginx

# SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Related files in repo

| File | Purpose |
|------|---------|
| `setup.sh` | Interactive local `.env` wizard |
| `install.sh` | Install backend + frontend packages |
| `start.sh` | Local dev start (both apps) |
| `RAILWAY.md` | Railway cloud deploy |
| **`LINUX_VPS_SETUP.md`** | **Yeh document — full VPS/RDP production** |

---

**Done.** Is flow ke baad project Linux server pe production mode mein live hona chahiye.

# Virtual OTP System — Full Linux Server Setup (VPS / RDP)

**Poora setup Linux pe chalega.** Windows pe production deploy is guide ka hissa nahi hai.

Yeh guide **Ubuntu 22.04 / 24.04** (ya Debian) ke liye hai.  
Iske baad project **IP** ya **domain** pe fully live: Frontend + Backend + PostgreSQL + Nginx.

---

## RDP buy karo ya Linux VPS? (pehle yeh samjho)

| Aap kya kharidte ho | Kya karna hai | Setup |
|---------------------|---------------|--------|
| **Linux VPS** (Ubuntu/Debian) — SSH only | Seedha SSH se connect | **Yahi guide** — same steps |
| **Linux RDP** (Ubuntu desktop + remote desktop) | RDP se desktop kholo, phir **Terminal** kholo | **Yahi guide** — commands same |
| **Windows RDP** | Production ke liye **recommended nahi** | Linux VPS lo, ya neeche note dekho |

### Easy recommendation

1. **Best / easiest:** Linux **VPS** (Ubuntu 22.04/24.04) — Contabo, Hetzner, DigitalOcean, Linode, Hostinger VPS, etc.
2. **Agar GUI chahiye:** Ubuntu VPS lo + optional desktop/RDP install (phir bhi saari commands **Terminal / SSH** se Linux pe).
3. **Windows RDP mat lo** is project ke production ke liye — Nginx, systemd, PostgreSQL, certbot sab Linux flow pe designed hain.

### Agar paas pehle se Windows RDP hai

- Production website **Windows pe mat chalao** is guide se.
- Options:
  - Alag **Linux VPS** buy karo (recommended), **ya**
  - Windows ke andar **WSL2 (Ubuntu)** install karke Linux jaisa setup (advanced; production ke liye alag full VPS better).

### Linux RDP / VPS dono pe flow same hai

```
Connect (SSH ya Linux desktop Terminal)
        │
        ▼
  Ubuntu/Debian Linux
        │
        ▼
  Yahi document ke saare steps
  (clone → postgres → build → nginx → domain)
```

- **SSH se connect:** `ssh user@YOUR_SERVER_IP`
- **Linux RDP se connect:** Remote Desktop → Ubuntu desktop → **Terminal** app kholo → wahi commands

Neeche se **Step 0** se start karo — RDP ho ya VPS, Linux pe commands **ek jaisi** hain.

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

## 0. Server prepare (first login — Linux only)

SSH ya Linux Terminal mein:

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

## 1. Clone project (VPS / Linux RDP — same)

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/faham112/virtual-otp-system.git
sudo chown -R $USER:$USER /var/www/virtual-otp-system
cd /var/www/virtual-otp-system

# Latest code
git pull origin main
```

Private repo ho to SSH key ya personal access token:

```bash
git clone https://<TOKEN>@github.com/faham112/virtual-otp-system.git
```

---

## 2. Install Node.js 20 (frontend build)

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

PostgreSQL 15+ pe:

```bash
sudo -u postgres psql -d virtual_otp -c "GRANT ALL ON SCHEMA public TO otpuser;"
```

**Connection string:**

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

# Domain:
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com

# Sirf IP test:
# CORS_ORIGINS=http://YOUR_SERVER_IP,http://127.0.0.1:3000
```

Secret generate:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

```bash
chmod 600 /var/www/virtual-otp-system/backend/.env
```

---

## 5. Frontend env + install + **build**

```bash
cd /var/www/virtual-otp-system/frontend
nano .env.production
```

**Domain:**

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

**IP only:**

```env
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP
```

```bash
npm install
npm run build
```

Build ke baad `.next` folder production serve karega.

---

## 6. Systemd (auto-start — Linux VPS aur Linux RDP dono)

### Backend

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

### Frontend

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

```bash
sudo chown -R www-data:www-data /var/www/virtual-otp-system

sudo systemctl daemon-reload
sudo systemctl enable otp-backend otp-frontend
sudo systemctl start otp-backend
sudo systemctl start otp-frontend

sudo systemctl status otp-backend --no-pager
sudo systemctl status otp-frontend --no-pager
```

Seed (tables + admin) pehli backend start pe auto.

```bash
curl -s http://127.0.0.1:8000/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
```

---

## 7. Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/virtual-otp
```

```nginx
upstream otp_api {
    server 127.0.0.1:8000;
}

upstream otp_web {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;

    server_name yourdomain.com www.yourdomain.com;
    # IP only: server_name YOUR_SERVER_IP;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://otp_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

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

```bash
sudo ln -sf /etc/nginx/sites-available/virtual-otp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Frontend `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

Rebuild + restart:

```bash
cd /var/www/virtual-otp-system/frontend
sudo chown -R $USER:$USER .
npm run build
sudo chown -R www-data:www-data /var/www/virtual-otp-system
sudo systemctl restart otp-frontend otp-backend
```

---

## 8. Domain DNS

| Type | Name | Value |
|------|------|--------|
| A | `@` | `YOUR_SERVER_IP` |
| A | `www` | `YOUR_SERVER_IP` |

```bash
dig +short yourdomain.com
```

---

## 9. SSL (HTTPS)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot renew --dry-run
```

HTTPS ke baad CORS + `NEXT_PUBLIC_API_URL` https rakho → frontend rebuild → services restart.

---

## 10. Launch checklist

```bash
sudo systemctl status otp-backend otp-frontend nginx postgresql --no-pager
ss -tlnp | grep -E ':80|:443|:3000|:8000|:5432'
curl -s http://127.0.0.1:8000/health
curl -I https://yourdomain.com
```

Browser: site → admin login → Admin Panel → markup / balance → Buy Number.

---

## 11. Code update later

```bash
cd /var/www/virtual-otp-system
sudo chown -R $USER:$USER .
git pull origin main

cd backend && source venv/bin/activate && pip install -r requirements.txt && deactivate
cd ../frontend && npm install && npm run build

cd /var/www/virtual-otp-system
sudo chown -R www-data:www-data .
sudo systemctl restart otp-backend otp-frontend
sudo systemctl reload nginx
```

---

## 12. IP-only (no domain)

1. Nginx: `server_name YOUR_SERVER_IP;`
2. Frontend: `NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP`
3. Backend: `CORS_ORIGINS=http://YOUR_SERVER_IP`
4. Rebuild frontend + restart all
5. Open `http://YOUR_SERVER_IP`

HTTPS ke liye domain zaroori hai.

---

## 13. Troubleshooting

```bash
sudo journalctl -u otp-backend -n 100 --no-pager
sudo journalctl -u otp-frontend -n 50 --no-pager
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
sudo systemctl status postgresql
```

CORS: origin exact match + rebuild after env change.  
Permissions: `sudo chown -R www-data:www-data /var/www/virtual-otp-system`

---

## 14. Security

1. Strong passwords + `SECRET_KEY`
2. `.env` → `chmod 600`, git pe mat daalo
3. UFW: 22, 80, 443
4. PostgreSQL localhost only
5. Apps bind `127.0.0.1` — public sirf Nginx

---

## Quick summary

```text
Buy → Linux VPS (Ubuntu)  YA  Linux RDP (Ubuntu desktop)
         │
         ▼
   Terminal / SSH  (sab Linux commands)
         │
         ▼
   Clone → PostgreSQL → backend .env → npm build
         → systemd → Nginx → Domain → SSL
         │
         ▼
   https://yourdomain.com  LIVE
```

**Windows RDP = is production guide ka target nahi.**  
**Linux VPS aur Linux RDP = same setup, yehi document.**

---

## Related files

| File | Purpose |
|------|---------|
| `setup.sh` / `install.sh` / `start.sh` | Local Linux dev |
| `RAILWAY.md` | Cloud (Railway) |
| **`LINUX_VPS_SETUP.md`** | **Production Linux VPS / Linux RDP** |

**Done.** Poora launch Linux server pe isi guide se.

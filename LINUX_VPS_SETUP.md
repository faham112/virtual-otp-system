# Virtual OTP System — Full Linux Server Setup (VPS / RDP)

**Poora setup Linux pe chalega.** Windows pe production deploy is guide ka hissa nahi hai.

Yeh guide **Ubuntu 22.04 / 24.04** (ya Debian) ke liye hai.  
Iske baad project **IP** ya **domain** pe fully live: Frontend + Backend + PostgreSQL + Nginx.

---

## RDP buy karo ya Linux VPS? (pehle yeh samjho)

| Aap kya kharidte ho | Kya karna hai | Setup |
|---------------------|---------------|--------|
| **Linux VPS** (Ubuntu/Debian) — SSH only | Seedha SSH se connect | **Yahi guide** — same steps |
| **Linux RDP** (Ubuntu desktop + remote desktop) | Pehle **SSH on** karo (neeche section), phir Termux / PC se SSH | **Yahi guide** |
| **Windows RDP** | Production ke liye **recommended nahi** | Linux VPS lo |

### Easy recommendation

1. **Best:** Linux **VPS** (Ubuntu 22.04/24.04) — aksar SSH pehle se on hota hai.
2. **Linux RDP:** Desktop se kaam chal sakta hai, lekin **SSH on karna lazim** hai taake Termux / phone / PC se bhi commands chalain.
3. **Windows RDP mat lo** is project ke production ke liye.

### Linux RDP / VPS dono pe app setup same hai

```
SSH (Termux/PC)  YA  Linux RDP Terminal
        │
        ▼
  Ubuntu/Debian Linux
        │
        ▼
  Clone → postgres → build → nginx → domain
```

---

## SSH setup on Linux RDP (lazim — Termux ke liye bhi)

Agar aapke paas **Linux RDP** hai (Ubuntu desktop), pehle machine pe **OpenSSH server** chalao.  
Iske baad aap:

- PC se: `ssh user@IP`
- **Termux (Android)** se: same `ssh user@IP`
- RDP desktop se: Terminal app

### A. RDP se login karke SSH install karo

Linux RDP desktop kholo → **Terminal** open karo → yeh commands:

```bash
# 1) System update
sudo apt update && sudo apt upgrade -y

# 2) OpenSSH server install
sudo apt install -y openssh-server

# 3) Enable + start
sudo systemctl enable ssh
sudo systemctl start ssh
sudo systemctl status ssh --no-pager
```

Status mein `active (running)` dikhna chahiye.

### B. Firewall pe port 22 allow

```bash
sudo ufw allow OpenSSH
# ya
sudo ufw allow 22/tcp

sudo ufw enable
sudo ufw status
```

### C. Apna username aur IP note karo

```bash
# Username (SSH login ke liye)
whoami

# Server IP (public)
curl -4 ifconfig.me
echo

# SSH listen kar raha hai?
ss -tlnp | grep ':22'
```

Provider panel se bhi **Public IP** dekh lo.

### D. Password se login allow? (default Ubuntu)

Zyada tar Ubuntu pe password SSH allowed hota hai. Check:

```bash
grep -E '^PasswordAuthentication|^#PasswordAuthentication' /etc/ssh/sshd_config
```

Agar `PasswordAuthentication no` hai aur aap password se login chahte ho:

```bash
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

**Zyada secure:** baad mein SSH keys use karo (neeche optional section).

### E. PC se test (Windows / Mac / Linux)

```bash
ssh YOUR_USERNAME@YOUR_SERVER_IP
# pehli baar: yes
# phir Linux user ka password
```

### F. Termux se SSH (Android)

Phone pe **Termux** install karo (F-Droid recommended).

```bash
# Termux ke andar
pkg update && pkg upgrade -y
pkg install -y openssh

# Server se connect
ssh YOUR_USERNAME@YOUR_SERVER_IP
```

Example:

```bash
ssh ubuntu@203.0.113.45
# ya
ssh faheem@YOUR_SERVER_IP
```

Password enter karo → Linux shell mil jayega → ab **yahi guide** ke Step 0 se project setup chalao.

### G. Optional: SSH key (password-less, safer)

**Termux / PC pe key banao:**

```bash
ssh-keygen -t ed25519 -C "termux-otp"
# Enter Enter (default path)
```

**Public key server pe copy:**

```bash
# Termux/PC se (password ek dafa maangega)
ssh-copy-id YOUR_USERNAME@YOUR_SERVER_IP
```

Agar `ssh-copy-id` na ho (Termux):

```bash
cat ~/.ssh/id_ed25519.pub | ssh YOUR_USERNAME@YOUR_SERVER_IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Phir:

```bash
ssh YOUR_USERNAME@YOUR_SERVER_IP
# password ke baghair login
```

### H. Linux VPS pe SSH pehle se hai?

Haan — aksar providers **root** ya `ubuntu` user + SSH key/password dete hain.  
Phir bhi check:

```bash
sudo systemctl status ssh --no-pager || sudo systemctl status sshd --no-pager
```

Band ho to upar wale **install + enable** steps chalao.

### I. Common SSH problems

| Problem | Fix |
|---------|-----|
| Connection refused | `sudo systemctl start ssh` + UFW `allow 22` |
| Timeout | Provider firewall / security group mein port **22** open karo |
| Permission denied | Sahi username + password; `whoami` RDP Terminal se dekho |
| Termux connect nahi | Phone wifi/data se server IP reachable? VPS public IP use karo |

**Provider panel:** kai VPS/RDP panels mein alag “Firewall / Security” hota hai — wahan **TCP 22** allow karna zaroori ho sakta hai (UFW ke saath).

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

## 0. Server prepare (SSH ya RDP Terminal — Linux only)

Ab aap **SSH (Termux/PC)** se connected ho, ya RDP Terminal mein ho — same commands:

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y git curl wget ufw build-essential \
  python3 python3-venv python3-pip \
  nginx postgresql postgresql-contrib \
  certbot python3-certbot-nginx openssh-server

sudo systemctl enable ssh
sudo systemctl start ssh

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 1. Clone project

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/faham112/virtual-otp-system.git
sudo chown -R $USER:$USER /var/www/virtual-otp-system
cd /var/www/virtual-otp-system
git pull origin main
```

Private repo:

```bash
git clone https://<TOKEN>@github.com/faham112/virtual-otp-system.git
```

---

## 2. Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

---

## 3. PostgreSQL

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql

sudo -u postgres psql <<'EOF'
CREATE USER otpuser WITH PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';
CREATE DATABASE virtual_otp OWNER otpuser;
GRANT ALL PRIVILEGES ON DATABASE virtual_otp TO otpuser;
\q
EOF

sudo -u postgres psql -d virtual_otp -c "GRANT ALL ON SCHEMA public TO otpuser;"
```

```text
postgresql://otpuser:CHANGE_THIS_STRONG_PASSWORD@127.0.0.1:5432/virtual_otp
```

```bash
psql "postgresql://otpuser:CHANGE_THIS_STRONG_PASSWORD@127.0.0.1:5432/virtual_otp" -c "SELECT 1;"
```

---

## 4. Backend

```bash
cd /var/www/virtual-otp-system/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
nano .env
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
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com
```

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
chmod 600 .env
```

---

## 5. Frontend build

```bash
cd /var/www/virtual-otp-system/frontend
nano .env.production
```

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
# IP only: NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP
```

```bash
npm install && npm run build
```

---

## 6. Systemd services

`/etc/systemd/system/otp-backend.service`:

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

`/etc/systemd/system/otp-frontend.service`:

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
sudo systemctl enable --now otp-backend otp-frontend
sudo systemctl status otp-backend otp-frontend --no-pager
curl -s http://127.0.0.1:8000/health
```

---

## 7. Nginx

```bash
sudo nano /etc/nginx/sites-available/virtual-otp
```

```nginx
upstream otp_api { server 127.0.0.1:8000; }
upstream otp_web { server 127.0.0.1:3000; }

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    # server_name YOUR_SERVER_IP;

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

    location /openapi.json { proxy_pass http://otp_api; proxy_set_header Host $host; }
    location /health { proxy_pass http://otp_api; proxy_set_header Host $host; }

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
sudo nginx -t && sudo systemctl reload nginx
```

Env change ke baad frontend rebuild + `sudo systemctl restart otp-frontend otp-backend`.

---

## 8. Domain DNS

| Type | Name | Value |
|------|------|--------|
| A | `@` | `YOUR_SERVER_IP` |
| A | `www` | `YOUR_SERVER_IP` |

---

## 9. SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 10–14. Checklist, updates, IP-only, troubleshoot, security

```bash
sudo systemctl status otp-backend otp-frontend nginx postgresql ssh --no-pager
curl -s http://127.0.0.1:8000/health
```

**Update code:**

```bash
cd /var/www/virtual-otp-system && sudo chown -R $USER:$USER . && git pull origin main
cd backend && source venv/bin/activate && pip install -r requirements.txt && deactivate
cd ../frontend && npm install && npm run build
sudo chown -R www-data:www-data /var/www/virtual-otp-system
sudo systemctl restart otp-backend otp-frontend && sudo systemctl reload nginx
```

**Security:** strong passwords, `.env` chmod 600, UFW 22/80/443, Postgres localhost only.

---

## Quick flow (RDP + Termux + full app)

```text
1. Linux RDP kholo (desktop)
2. Terminal → OpenSSH install + UFW allow 22
3. Termux / PC → ssh user@SERVER_IP
4. SSH session mein → clone → postgres → backend → npm build
5. systemd + nginx + domain + SSL
6. https://yourdomain.com LIVE
```

**SSH RDP pe lazim** taake Termux se bhi same server control ho.  
**App setup** har haal mein **Linux commands** se — yehi document.

---

## Related files

| File | Purpose |
|------|---------|
| `setup.sh` / `install.sh` / `start.sh` | Local Linux dev |
| `RAILWAY.md` | Cloud |
| **`LINUX_VPS_SETUP.md`** | **VPS + Linux RDP + SSH/Termux + production** |

**Done.**

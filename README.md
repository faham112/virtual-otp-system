# Virtual OTP System

Multi-user Virtual Number / OTP Receiving System  
**FastAPI** + **Next.js 15** + **PostgreSQL / SQLite**

Version **2.2** — Admin panel, live prices/stock, fixed markup, Railway + **Linux VPS** ready.

---

## Features

- Multi-user JWT auth + wallet system
- Admin panel (users, balance, markup, orders, provider wallet)
- **Seed system** — admin + tables auto from `.env`
- Live price & stock before buy
- Real-time OTP polling (8s) + copy OTP
- Full refund on timeout / fail
- Race-condition safe balance
- Railway + PostgreSQL + **full VPS/Nginx guide**

---

## Quick Local Setup

```bash
git clone https://github.com/faham112/virtual-otp-system.git
cd virtual-otp-system

bash setup.sh      # .env + admin credentials
bash install.sh    # all packages
bash start.sh      # frontend + backend
```

Open http://localhost:3000

---

## Production deploy

From your development machine, one command commits and pushes the current code,
then installs dependencies, builds the production frontend, restarts both VPS
services, validates Nginx, and checks the local health endpoints:

```bash
OTP_VPS_HOST=your-server-ip OTP_VPS_USER=your-ssh-user \
	bash deploy-otp.sh "Release message"
```

The server must already be provisioned according to the Linux guide, with
`backend/.env` and `frontend/.env.production` present. To deploy the existing
remote branch without committing or pushing local changes, use
`OTP_SKIP_PUSH=1`.

On the VPS, bootstrap the command once after SSH:

```bash
cd /var/www/html/virtual-otp-system
sudo install -m 755 deploy-otp /usr/local/bin/deploy-otp
deploy-otp
```

The first run asks for the production database, admin, and 5sim credentials,
then creates the database, synchronizes application tables and seed data,
configures services, preserves existing HTTPS/Nginx settings, and builds production.
After that, simply run `deploy-otp` after SSH to pull and deploy the newest code.
To commit and push code that is already on the VPS, run `deploy-otp push`.

| Guide | Use case |
|-------|----------|
| **[LINUX_VPS_SETUP.md](./LINUX_VPS_SETUP.md)** | **Full VPS / RDP: clone → PostgreSQL → build → Nginx → domain → SSL** |
| [RAILWAY.md](./RAILWAY.md) | Railway cloud (Postgres + backend + frontend) |

---

## Project Structure

```
virtual-otp-system/
├── setup.sh / install.sh / start.sh
├── LINUX_VPS_SETUP.md       # Full Linux server guide
├── RAILWAY.md
├── backend/                 # FastAPI (port 8000)
└── frontend/                # Next.js (port 3000)
```

---

## Author

Built for multi-user OTP receiving system.

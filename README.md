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

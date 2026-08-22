# Virtual OTP System

Multi-user Virtual Number / OTP Receiving System  
**FastAPI** + **Next.js 15** + **5sim.net**

Version **2.0** — Seed system, high security, advanced UI, country flags, auto OTP polling.

---

## Features

- Multi-user system with JWT Authentication
- Wallet system (Admin controls balance)
- Admin can set markup / pricing
- **Seed system** — admin + default settings auto-created from `.env`
- Real-time OTP polling on Dashboard (every 8s)
- Automatic full refund if OTP fails / times out
- Country selection with flags — **only selected country is requested**
- Strong password rules + input validation
- Secure CORS from environment
- Race-condition safe balance updates
- Clean dark modern UI

## Tech Stack

| Layer     | Stack                                      |
|-----------|--------------------------------------------|
| Backend   | Python FastAPI + SQLAlchemy + SQLite/MySQL |
| Frontend  | Next.js 15 (App Router) + Tailwind CSS     |
| Auth      | JWT (python-jose) + bcrypt                 |
| SMS       | 5sim.net                                   |

---

## Quick Start (Local)

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env — at minimum set FIVESIM_API_KEY and SECRET_KEY

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On first run the **seed system** will:
- Create tables
- Create admin user from `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL`
- Set default markup from `DEFAULT_MARKUP_PERCENT`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Open http://localhost:3000

---

## Environment Variables (backend/.env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | `sqlite:///./virtual_otp.db` (local) or MySQL URL |
| `SECRET_KEY` | Long random string (min 32 chars) |
| `FIVESIM_API_KEY` | Your 5sim API key |
| `ADMIN_USERNAME` | Admin username (default: admin) |
| `ADMIN_EMAIL` | Admin email |
| `ADMIN_PASSWORD` | Strong admin password |
| `DEFAULT_MARKUP_PERCENT` | Default markup % (default 50) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

---

## Project Structure

```
virtual-otp-system/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── seed.py          # Auto seed on startup
│   │   ├── auth.py
│   │   ├── models.py
│   │   ├── schemas.py       # Strong validation
│   │   ├── routers/
│   │   └── services/fivesim.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/       # Live OTP polling
│   │   └── buy/             # Country flags + strict country
│   └── ...
└── README.md
```

---

## Security Highlights

- Password must be ≥8 chars, 1 uppercase, 1 digit
- JWT with proper expiry + iat
- CORS locked to configured origins
- Row-level locking (`with_for_update`) on balance changes
- Service & Country whitelist validation
- No wildcard CORS in production

---

## Author

Built for multi-user OTP receiving system.

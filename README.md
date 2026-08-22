# Virtual OTP System

Multi-user Virtual Number / OTP Receiving System  
**FastAPI** + **Next.js 15** + **5sim.net** + **PostgreSQL / SQLite**

Version **2.1** — Railway ready, PostgreSQL support, interactive `setup.sh`, seed system, advanced UI.

---

## Features

- Multi-user JWT auth + wallet system
- Admin markup / balance control
- **Seed system** — admin + tables auto from `.env`
- Real-time OTP polling (8s)
- Country flags + strict country only
- Full refund on timeout / fail
- Race-condition safe balance
- Railway + PostgreSQL production ready

---

## Quick Local Setup

```bash
git clone https://github.com/faham112/virtual-otp-system.git
cd virtual-otp-system

# Interactive wizard — asks for keys, creates .env, ready for seed
bash setup.sh

# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install && npm run dev
```

Open http://localhost:3000 — login with admin credentials you entered in `setup.sh`.

Seed (tables + admin) **automatically** runs on first backend start.

---

## Railway Deployment (Frontend + Backend + Postgres)

Full guide: **[RAILWAY.md](./RAILWAY.md)**

Short version:

1. Railway pe New Project
2. **+ Database → PostgreSQL** (alag service)
3. **Backend** service — Root Directory = `backend`  
   Variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}` + SECRET_KEY, FIVESIM_API_KEY, ADMIN_*, CORS_ORIGINS
4. **Frontend** service — Root Directory = `frontend`  
   Variable: `NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app`
5. Deploy → seed auto-chalega → admin ready

---

## Project Structure

```
virtual-otp-system/
├── setup.sh                 # Interactive .env + seed wizard
├── RAILWAY.md               # Full Railway guide
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── seed.py
│   │   ├── database.py      # SQLite + MySQL + PostgreSQL
│   │   └── ...
│   ├── requirements.txt
│   ├── railway.toml
│   └── Procfile
├── frontend/
│   ├── app/
│   ├── railway.toml
│   └── ...
└── README.md
```

---

## Author

Built for multi-user OTP receiving system.

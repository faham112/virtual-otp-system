# Railway Deployment Guide (Frontend + Backend + PostgreSQL)

Ye guide se **Frontend**, **Backend** aur **PostgreSQL** teeno Railway pe chalenge.

---

## Architecture

```
Railway Project
├── PostgreSQL          (alag service - Database)
├── Backend (FastAPI)   (Root Directory: /backend)
└── Frontend (Next.js)  (Root Directory: /frontend)
```

---

## Step-by-step

### 1. Railway Account

1. https://railway.app pe jaao
2. GitHub se login karo
3. **New Project** banao

### 2. PostgreSQL Service

1. Project canvas pe **+ New** → **Database** → **PostgreSQL**
2. Railway automatically `DATABASE_URL` create karega
3. Is service ka naam rakho: `Postgres` (ya jo chaaho)

### 3. Backend Service

1. **+ New** → **GitHub Repo** → `faham112/virtual-otp-system` select karo
2. Service settings:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Variables** tab me ye add karo:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Reference Variable) |
| `SECRET_KEY` | long random string (setup.sh se lo) |
| `FIVESIM_API_KEY` | your real 5sim key |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_EMAIL` | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | strong password |
| `DEFAULT_MARKUP_PERCENT` | `50` |
| `CORS_ORIGINS` | `https://YOUR-FRONTEND.up.railway.app` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |

4. Deploy → wait until healthy
5. **Settings** → **Networking** → **Generate Domain** (backend public URL mil jayega)

> Pehli deploy pe **seed** automatically chalega → tables + admin user ban jayenge.

### 4. Frontend Service

1. Same project me **+ New** → **GitHub Repo** → same repo select
2. Service settings:
   - **Root Directory**: `frontend`
   - Build: auto (Nixpacks)
   - Start: `npm run start`
3. **Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-BACKEND.up.railway.app` |

4. Deploy → **Generate Domain** for frontend
5. Backend ke `CORS_ORIGINS` me frontend domain daalo aur re-deploy backend

### 5. Final Check

- Frontend URL open karo
- Admin se login karo (jo credentials Variables me set kiye)
- Balance add karo Admin API se ya pehle se seed me 0 balance hota hai
- Number buy test karo

---

## Local pe pehle test (optional)

```bash
# Repo clone
git clone https://github.com/faham112/virtual-otp-system.git
cd virtual-otp-system

# Interactive setup (env + seed ready)
bash setup.sh
# Mode 1 choose karo (SQLite)

# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install && npm run dev
```

---

## Important Notes

- Railway `PORT` env automatically set karta hai — code already support karta hai
- `DATABASE_URL` me `postgres://` aaye to code automatically `postgresql://` me convert karta hai
- Seed **har startup** pe chalega lekin admin sirf tab create hoga jab pehle se na ho
- Production me `ADMIN_PASSWORD` strong rakho aur baad me change karo
- Free tier pe sleep ho sakta hai — paid plan recommended for always-on

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Backend crash on start | `DATABASE_URL` reference sahi hai? Postgres service running? |
| CORS error | Frontend domain `CORS_ORIGINS` me exact match hona chahiye |
| Admin login fail | Variables me `ADMIN_*` set the? Seed logs check karo |
| Frontend API fail | `NEXT_PUBLIC_API_URL` backend public URL pe point kar raha hai? |

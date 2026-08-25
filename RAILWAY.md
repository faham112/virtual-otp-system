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
   - **Do NOT** use `bash start.sh` (woh sirf local ke liye hai)
3. **Variables** tab me ye add karo (copy-paste):

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=033c904f0ebdd3413a794a94017db4c3aa4c2641a1bdae4831a2dd231caff883
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FIVESIM_API_KEY=YOUR_REAL_5SIM_API_KEY_HERE
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@Secure123!
DEFAULT_MARKUP_PERCENT=50
CORS_ORIGINS=https://YOUR-FRONTEND.up.railway.app
```

> Agar Postgres reference nahi chal raha to direct connection string use karo.

4. Deploy → wait until healthy
5. **Settings** → **Networking** → **Generate Domain** (backend public URL mil jayega)

> Pehli deploy pe **seed** automatically chalega → tables + admin user ban jayenge.

### 4. Frontend Service

1. Same project me **+ New** → **GitHub Repo** → same repo select
2. Service settings:
   - **Root Directory**: `frontend`
   - Build: auto (Nixpacks)
   - Start: `npm run start`
3. **Variables** (sirf ye ek):

```env
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.up.railway.app
```

4. Deploy → **Generate Domain** for frontend
5. Backend ke `CORS_ORIGINS` me **exact** frontend domain daalo aur backend re-deploy karo

### 5. Final Check

- Frontend URL open karo
- Admin se login: `admin` / `Admin@Secure123!`
- Balance add karo Admin dashboard se
- Number buy test karo

---

## Important Notes

- Railway `PORT` env automatically set karta hai
- `DATABASE_URL` me `postgres://` aaye to code automatically `postgresql://` me convert karta hai
- Seed **har startup** pe chalega lekin admin sirf tab create hoga jab pehle se na ho
- **`.railway.internal`** domain sirf service-to-service internal networking ke liye hai — browser / `NEXT_PUBLIC_API_URL` me **public** `*.up.railway.app` URL use karo
- Free tier pe sleep ho sakta hai — paid plan recommended for always-on

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Backend venv missing` | Start Command galat hai. Use: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Backend crash on start | `DATABASE_URL` sahi hai? Postgres running? |
| CORS error | Frontend domain `CORS_ORIGINS` me exact match hona chahiye |
| Admin login fail | Variables me `ADMIN_*` set the? Seed logs check karo |
| Frontend API fail | `NEXT_PUBLIC_API_URL` backend **public** URL pe point kar raha hai? |

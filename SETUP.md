# Full Setup Guide (Local + Hostinger Ready)

## Local Development (Recommended First)

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
```

Edit `backend/.env`:

```env
DATABASE_URL=sqlite:///./virtual_otp.db

SECRET_KEY=paste_a_long_random_string_here_at_least_32_chars
FIVESIM_API_KEY=your_real_5sim_key

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@Secure123!

DEFAULT_MARKUP_PERCENT=50
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Generate a strong SECRET_KEY:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Run:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On first start you will see:

```
[SEED] Created default markup_percent = 50%
[SEED] Created admin user: admin
[SEED] Database seed completed successfully
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Keep: NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Open: http://localhost:3000

Login with the admin credentials from `.env`.

---

## Production / Hostinger (MySQL)

### Database

1. Hostinger hPanel → Databases → MySQL Databases
2. Create database + user with All Privileges
3. Note: name, username, password, host (usually `localhost`)

### Backend .env

```env
DATABASE_URL=mysql+pymysql://DB_USER:DB_PASS@localhost:3306/DB_NAME
SECRET_KEY=your_long_secret
FIVESIM_API_KEY=your_key
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=VeryStrongPassword123!
DEFAULT_MARKUP_PERCENT=50
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Run backend on VPS / Railway / Render (shared hosting has limited Python support).

### Frontend

```bash
cd frontend
npm install
npm run build
npm start
```

Or deploy via Hostinger Web App pointing to `/frontend`.

---

## Important Notes

- SQLite is perfect for local testing — zero setup
- MySQL works great on Hostinger for production data
- Backend (FastAPI) is best on VPS / Railway / Render
- Frontend Next.js can run on Hostinger Web App or Vercel
- Never commit real `.env` files
- Change `ADMIN_PASSWORD` immediately after first login in production

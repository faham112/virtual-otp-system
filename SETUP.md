# Full Setup Guide (MySQL + Hostinger Ready)

## 1. Database (MySQL) Setup on Hostinger

1. Hostinger hPanel → **Databases** → **MySQL Databases**
2. Create a new database (example name: `virtual_otp`)
3. Create a database user and set strong password
4. Add the user to the database with **All Privileges**

Note down:
- Database Name
- Database Username
- Database Password
- Host (usually `localhost`)

## 2. Backend Setup

```bash
cd backend
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Linux / Hostinger terminal:
source venv/bin/activate

pip install -r requirements.txt
```

Create `.env` file:

```env
DATABASE_URL=mysql+pymysql://DB_USERNAME:DB_PASSWORD@localhost:3306/DB_NAME

SECRET_KEY=any_long_random_string_here_123456789
FIVESIM_API_KEY=your_real_5sim_key
```

Run:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run build
npm start
```

Or on Hostinger use **Deploy Web App** and point to `/frontend` folder.

## Important Notes

- MySQL Hostinger pe perfectly kaam karta hai
- Backend (FastAPI) ke liye better hai VPS / Railway / Render use karo
- Shared hosting pe Python apps limited support dete hain
- Frontend Next.js Hostinger Web App pe chal sakta hai

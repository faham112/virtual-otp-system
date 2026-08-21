# Full Setup Guide

## 1. Clone the repository

```bash
git clone https://github.com/faham112/virtual-otp-system.git
cd virtual-otp-system
```

## 2. Backend Setup

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/virtual_otp
# Or for quick testing use SQLite:
# DATABASE_URL=sqlite:///./virtual_otp.db

SECRET_KEY=your_very_long_random_secret_key_here
FIVESIM_API_KEY=your_real_5sim_api_key
```

Run the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API Docs: http://localhost:8000/docs

## 3. Create Admin User

After first run, you can register normally then manually set `is_admin = true` in database, or I can add a script later.

## 4. Frontend (Coming next)

```bash
cd frontend
npm install
npm run dev
```

## Important Notes

- OTP fail hone pe automatic full refund hota hai
- Markup default 100% hai (admin change kar sakta hai)
- 5sim API key zaroori hai

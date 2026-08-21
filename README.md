# Virtual OTP System

Multi-user Virtual Number / OTP Receiving System built with **FastAPI** (Backend) + **Next.js** (Frontend) + **5sim.net** integration.

## Features

- Multi-user system with JWT Authentication
- Wallet system (Admin controls balance)
- Admin can set markup / pricing
- Real-time OTP display on frontend
- Automatic full refund if OTP fails / times out
- Number expires after OTP received
- Clean Admin + User Dashboard
- 5sim.net API integration

## Tech Stack

- **Backend**: Python FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Auth**: JWT
- **SMS Provider**: 5sim.net

## Project Structure

```
virtual-otp-system/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── routers/
│   │   └── services/
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # Next.js Frontend
│   ├── app/
│   ├── components/
│   └── ...
├── .github/workflows/       # CI/CD
└── README.md
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables

See `backend/.env.example`

## Author

Built for multi-user OTP receiving system.

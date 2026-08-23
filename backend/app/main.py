from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, users, orders, admin, catalog
from app.seed import seed_database
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[STARTUP] Creating tables if needed...")
    Base.metadata.create_all(bind=engine)
    print("[STARTUP] Running seed...")
    seed_database()
    print("[STARTUP] Virtual OTP System ready")
    yield
    # Shutdown
    print("[SHUTDOWN] App stopping")

app = FastAPI(
    title="Virtual OTP System",
    description="Multi-user Virtual Number System with 5sim integration - Secure & Production Ready",
    version="2.2.0",
    lifespan=lifespan
)

# Secure CORS from .env
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/")
def root():
    return {
        "message": "Virtual OTP System API is running",
        "docs": "/docs",
        "version": "2.2.0",
        "status": "healthy"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.2.0"}

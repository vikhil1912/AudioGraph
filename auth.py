"""
JWT Authentication router.
Provides register, login, refresh, and me endpoints.
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import bcrypt
from jose import jwt, JWTError
from dotenv import load_dotenv

import database

load_dotenv()

# ── Configuration ───────────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production-please")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    # bcrypt requires bytes
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except ValueError:
        return False

security = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Request / Response Models ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str


# ── Token Utilities ─────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ── Dependency: Get Current User ────────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency that extracts and validates the JWT from the Authorization header.
    Returns the user document from MongoDB.
    """
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    user = await database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    """Register a new user account."""
    # Check if email already exists
    existing = await database.get_user_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    
    # Hash password and create user
    password_hash = hash_password(req.password)
    user = await database.create_user(req.email, password_hash)
    user_id = user["_id"]
    
    # Generate tokens
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    
    # Store refresh token
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await database.store_refresh_token(user_id, refresh_token, expire.isoformat())
    
    # Broadcast stats update
    import asyncio
    from api_server import stats_manager
    asyncio.create_task(stats_manager.broadcast())

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """Login with email and password."""
    user = await database.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    user_id = user["_id"]
    
    # Generate tokens
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    
    # Store refresh token
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await database.store_refresh_token(user_id, refresh_token, expire.isoformat())
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest):
    """Get a new access token using a valid refresh token."""
    # Decode the refresh token
    payload = decode_token(req.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    # Check if refresh token exists in DB (hasn't been revoked)
    stored = await database.get_refresh_token(req.refresh_token)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked or invalid",
        )
    
    user_id = payload.get("sub")
    
    # Delete old refresh token (rotate)
    await database.delete_refresh_token(req.refresh_token)
    
    # Issue new tokens
    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)
    
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await database.store_refresh_token(user_id, new_refresh_token, expire.isoformat())
    
    return TokenResponse(access_token=new_access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )

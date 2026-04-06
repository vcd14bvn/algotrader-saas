"""AlgoTrader Pro — Auth Routes"""
import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from bson import ObjectId
from app.database import get_db
from app.auth import hash_password, verify_password, create_token, get_current_user, require_role
from app.models.schemas import LoginRequest, RegisterRequest, ChangePasswordRequest, AuthResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

# Simple in-memory rate limiter for login (resets on restart)
import time as _time
_login_attempts: dict = {}  # {ip: [timestamp, ...]}
_MAX_ATTEMPTS = 5
_WINDOW_SECS  = 300  # 5 minutes

def _check_rate_limit(request):
    """Allow max 5 login attempts per IP per 5 minutes."""
    from fastapi import Request
    ip = getattr(request, "client", None)
    ip = ip.host if ip else "unknown"
    now = _time.time()
    attempts = [t for t in _login_attempts.get(ip, []) if now - t < _WINDOW_SECS]
    if len(attempts) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 5 minutes.")
    attempts.append(now)
    _login_attempts[ip] = attempts


@router.post("/login")
async def login(req: LoginRequest, request: Request):
    _check_rate_limit(request)
    db = get_db()
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(str(user["_id"]), user["email"], user["role"])
    user["_id"] = str(user["_id"])
    del user["password"]
    # Ensure approved field exists (legacy users default to approved)
    user.setdefault("approved", True)
    return {"token": token, "user": user}


@router.post("/register")
async def register(req: RegisterRequest, user=Depends(require_role("admin"))):
    """Admin-created users: always approved immediately."""
    db = get_db()
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": req.email,
        "password": hash_password(req.password),
        "name": req.name,
        "role": req.role.value,
        "approved": True,  # Admin-created users are always approved
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    del doc["password"]
    return {"message": "User created", "user": doc}


@router.post("/register-public")
async def register_public(req: RegisterRequest):
    """Public self-registration — users start as pending until admin approves."""
    db = get_db()
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": req.email,
        "password": hash_password(req.password),
        "name": req.name,
        "role": "trader",
        "approved": False,  # Must be approved by admin before access
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    del doc["password"]
    # Return a token so the frontend can show a "pending" screen
    token = create_token(doc["_id"], doc["email"], doc["role"])
    return {"message": "Registration successful. Awaiting admin approval.", "token": token, "user": doc}


# ── Admin User Management ──────────────────────────────────────────────────────

@router.get("/users")
async def list_users(admin=Depends(require_role("admin"))):
    """Admin-only: list all registered users."""
    db = get_db()
    cursor = db.users.find({}, {"password": 0})
    users = []
    async for u in cursor:
        u["_id"] = str(u["_id"])
        u.setdefault("approved", True)
        users.append(u)
    return {"users": users}


@router.post("/approve/{user_id}")
async def approve_user(user_id: str, admin=Depends(require_role("admin"))):
    """Admin-only: approve a pending user."""
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"approved": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User approved successfully"}


@router.post("/reject/{user_id}")
async def reject_user(user_id: str, admin=Depends(require_role("admin"))):
    """Admin-only: reject and delete a pending user."""
    db = get_db()
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User rejected and removed"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_role("admin"))):
    """Admin-only: delete any user."""
    db = get_db()
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


@router.post("/refresh")
async def refresh_token(user=Depends(get_current_user)):
    token = create_token(str(user["_id"]), user["email"], user["role"])
    return {"token": token, "user": user}


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    db = get_db()
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(req.old_password, full_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"password": hash_password(req.new_password)}}
    )
    return {"message": "Password changed successfully"}

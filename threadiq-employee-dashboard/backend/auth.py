"""
ThreadIQ Authentication & Session Manager
Handles secure session tokens, password verification, and store-level authorization.
"""

import secrets
import time
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.database import get_db, verify_password

security = HTTPBearer(auto_error=False)

# In-memory active session tokens store
# token -> { "employee_id": str, "name": str, "email": str, "store_id": str, "role": str, "expires_at": float }
ACTIVE_SESSIONS = {}
SESSION_EXPIRY_SECONDS = 86400  # 24 hours

def authenticate_employee(employee_id_or_email: str, password: str):
    """Authenticates employee by ID or email and returns employee record if valid."""
    conn = get_db()
    cur = conn.execute("""
        SELECT e.employee_id, e.name, e.email, e.password_hash, e.password_salt,
               e.assigned_store_id, e.role, e.account_status,
               s.store_name, s.store_code, s.city, s.address, s.zone
        FROM employees e
        JOIN stores s ON e.assigned_store_id = s.store_id
        WHERE (LOWER(e.employee_id) = LOWER(?) OR LOWER(e.email) = LOWER(?))
          AND e.account_status = 'active';
    """, (employee_id_or_email.strip(), employee_id_or_email.strip()))
    user = cur.fetchone()
    conn.close()

    if not user:
        return None

    if not verify_password(password, user["password_hash"], user["password_salt"]):
        return None

    return dict(user)

def create_session(user_data: dict) -> str:
    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[token] = {
        "employee_id": user_data["employee_id"],
        "name": user_data["name"],
        "email": user_data["email"],
        "store_id": user_data["assigned_store_id"],
        "store_name": user_data["store_name"],
        "store_code": user_data["store_code"],
        "role": user_data["role"],
        "expires_at": time.time() + SESSION_EXPIRY_SECONDS
    }
    return token

def revoke_session(token: str):
    if token in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[token]

def get_current_employee(request: Request, creds: HTTPAuthorizationCredentials = Security(security)) -> dict:
    token = None
    # 1. Bearer Header
    if creds and creds.credentials:
        token = creds.credentials
    # 2. Query param (for SSE EventSource or WebSocket)
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token or token not in ACTIVE_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid credentials. Please log in."
        )

    session = ACTIVE_SESSIONS[token]
    if time.time() > session["expires_at"]:
        del ACTIVE_SESSIONS[token]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )

    return session

def get_optional_employee(request: Request, creds: HTTPAuthorizationCredentials = Security(security)) -> dict | None:
    """Returns employee session if valid token is provided, or None without throwing 401."""
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token or token not in ACTIVE_SESSIONS:
        return None

    session = ACTIVE_SESSIONS[token]
    if time.time() > session["expires_at"]:
        del ACTIVE_SESSIONS[token]
        return None

    return session

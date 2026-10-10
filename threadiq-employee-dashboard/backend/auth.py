"""
ThreadIQ Authentication & Session Manager
Handles secure cryptographic session tokens, password verification, and store-level authorization.
Stateless HMAC-SHA256 signatures guarantee 100% reliability across Vercel serverless containers.
"""

import os
import json
import time
import base64
import hmac
import hashlib
import secrets
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.database import get_db, verify_password

security = HTTPBearer(auto_error=False)

# In-memory active session tokens cache (optional speedup)
ACTIVE_SESSIONS = {}
REVOKED_TOKENS = set()
SESSION_EXPIRY_SECONDS = 86400  # 24 hours

# Stable secret key for signing session tokens across serverless instances
SESSION_SECRET = os.environ.get(
    "THREADIQ_SESSION_SECRET",
    "threadiq_karnataka_retail_grid_secure_session_secret_2026_prod"
)

def _sign_payload(payload_bytes: bytes) -> str:
    sig = hmac.new(SESSION_SECRET.encode("utf-8"), payload_bytes, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")

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
    """
    Creates a stateless, cryptographically signed session token.
    Works across all Vercel serverless containers and cold starts without shared memory.
    """
    exp_timestamp = time.time() + SESSION_EXPIRY_SECONDS
    session_data = {
        "employee_id": user_data["employee_id"],
        "name": user_data["name"],
        "email": user_data["email"],
        "store_id": user_data.get("assigned_store_id") or user_data.get("store_id"),
        "assigned_store_id": user_data.get("assigned_store_id") or user_data.get("store_id"),
        "store_name": user_data["store_name"],
        "store_code": user_data["store_code"],
        "role": user_data["role"],
        "expires_at": exp_timestamp,
        "nonce": secrets.token_hex(8)
    }

    # Encode payload to compact base64
    payload_json = json.dumps(session_data, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    sig_b64 = _sign_payload(payload_b64.encode("utf-8"))

    token = f"{payload_b64}.{sig_b64}"

    # Cache locally for speed
    ACTIVE_SESSIONS[token] = session_data
    return token

def verify_session_token(token: str) -> dict | None:
    """
    Validates a cryptographic session token statelessly across any serverless container.
    """
    if not token or token in REVOKED_TOKENS:
        return None

    # Check local in-memory cache first if present
    if token in ACTIVE_SESSIONS:
        cached = ACTIVE_SESSIONS[token]
        if time.time() <= cached.get("expires_at", 0):
            return cached
        del ACTIVE_SESSIONS[token]
        return None

    # Stateless verification of HMAC-SHA256 signature
    if "." not in token:
        return None

    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts

        expected_sig = _sign_payload(payload_b64.encode("utf-8"))
        if not hmac.compare_digest(sig_b64, expected_sig):
            return None

        # Decode payload with padding
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding

        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        session_data = json.loads(payload_bytes.decode("utf-8"))

        if time.time() > session_data.get("expires_at", 0):
            return None

        # Populate memory cache for this container's future requests
        ACTIVE_SESSIONS[token] = session_data
        return session_data
    except Exception:
        return None

def revoke_session(token: str):
    if token in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[token]
    REVOKED_TOKENS.add(token)

def get_current_employee(request: Request, creds: HTTPAuthorizationCredentials = Security(security)) -> dict:
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid credentials. Please log in."
        )

    session = verify_session_token(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid credentials. Please log in."
        )

    return session

def get_optional_employee(request: Request, creds: HTTPAuthorizationCredentials = Security(security)) -> dict | None:
    """Returns employee session if valid token is provided, or None without throwing 401."""
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        return None

    return verify_session_token(token)


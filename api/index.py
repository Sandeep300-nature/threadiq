"""
ThreadIQ Vercel Serverless API Gateway
Routes /api/* requests to FastAPI on Vercel.

If BACKEND_URL or THREADIQ_BACKEND_URL is set in Vercel environment variables,
this gateway transparently reverse-proxies requests to the persistent Uvicorn
container (e.g., Railway, Render, Fly.io, or VPS) under the SAME public Vercel host.
If the external backend is unavailable or unconfigured, it gracefully falls back
to the local FastAPI application with SQLite storage and seeded demo employee accounts.
"""

import os
import sys
import logging
import urllib.request
import urllib.error

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
EMPLOYEE_DIR = os.path.join(ROOT_DIR, "threadiq-employee-dashboard")

if EMPLOYEE_DIR not in sys.path:
    sys.path.insert(0, EMPLOYEE_DIR)

from fastapi import Request, Response
from backend.main import app
from backend.database import init_db

# Ensure SQLite database and demo accounts are initialized
try:
    init_db()
except Exception as e:
    logging.warning(f"[ThreadIQ Gateway] init_db warning: {e}")

BACKEND_URL = os.environ.get("THREADIQ_BACKEND_URL") or os.environ.get("BACKEND_URL")

@app.middleware("http")
async def vercel_path_normalizer(request: Request, call_next):
    """
    Normalizes request paths arriving from Vercel rewrites:
    1. If Vercel passed /api/index.py as the path, extracts real URI from x-matched-path or x-forwarded-uri.
    2. If Vercel stripped the /api prefix, re-attaches /api so FastAPI routes match.
    """
    matched = request.headers.get("x-matched-path") or request.headers.get("x-forwarded-uri")
    current_path = request.scope.get("path", "")

    # Check if path is the serverless entrypoint
    if current_path in ("/api/index.py", "/api/index.py/", "/api/index", "/api", "/api/"):
        if matched:
            clean_matched = matched.split("?")[0]
            if clean_matched.startswith("/api"):
                request.scope["path"] = clean_matched
            else:
                request.scope["path"] = "/api" + clean_matched
        else:
            request.scope["path"] = "/api/health"

    # Ensure path starts with /api
    elif not current_path.startswith("/api"):
        request.scope["path"] = "/api" + current_path

    # Optional proxying if BACKEND_URL is configured
    if BACKEND_URL:
        target_backend = BACKEND_URL.rstrip("/")
        # Avoid proxy loops
        if not request.headers.get("x-threadiq-proxied"):
            target_path = request.scope["path"]
            target_url = f"{target_backend}{target_path}"
            if request.url.query:
                target_url += f"?{request.url.query}"

            headers = dict(request.headers)
            headers.pop("host", None)
            headers["x-threadiq-proxied"] = "true"
            body = await request.body()

            req = urllib.request.Request(
                target_url,
                data=body if body else None,
                headers=headers,
                method=request.method
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    content = resp.read()
                    resp_headers = dict(resp.headers)
                    return Response(
                        content=content,
                        status_code=resp.status,
                        headers=resp_headers
                    )
            except urllib.error.HTTPError as e:
                return Response(
                    content=e.read(),
                    status_code=e.code,
                    headers=dict(e.headers)
                )
            except Exception as e:
                # If external backend is unreachable, gracefully fall back to local FastAPI execution
                logging.warning(f"[ThreadIQ Gateway] External backend unreachable ({e}); falling back to local handler.")

    return await call_next(request)

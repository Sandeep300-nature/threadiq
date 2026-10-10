"""
ThreadIQ Vercel Serverless API Gateway
Routes /api/* requests to FastAPI on Vercel.

If BACKEND_URL or THREADIQ_BACKEND_URL is set in Vercel environment variables,
this gateway transparently reverse-proxies requests to the persistent Uvicorn
container (e.g., Railway, Render, Fly.io, or VPS) under the SAME public Vercel host.

If no external backend is configured, it executes the FastAPI application
locally on Vercel with ephemeral SQLite storage in tempfile directory.
"""

import os
import sys
import urllib.request
import urllib.error

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
EMPLOYEE_DIR = os.path.join(ROOT_DIR, "threadiq-employee-dashboard")

if EMPLOYEE_DIR not in sys.path:
    sys.path.insert(0, EMPLOYEE_DIR)

from backend.main import app

BACKEND_URL = os.environ.get("THREADIQ_BACKEND_URL") or os.environ.get("BACKEND_URL")

if BACKEND_URL:
    BACKEND_URL = BACKEND_URL.rstrip("/")
    from fastapi import Request, Response

    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    async def proxy_to_external_backend(request: Request, path: str):
        target_url = f"{BACKEND_URL}/api/{path}"
        if request.url.query:
            target_url += f"?{request.url.query}"

        headers = dict(request.headers)
        headers.pop("host", None)
        body = await request.body()

        req = urllib.request.Request(
            target_url,
            data=body if body else None,
            headers=headers,
            method=request.method
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
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
            return Response(
                content=f'{{"error": "Failed to connect to backend: {str(e)}"}}',
                status_code=502,
                media_type="application/json"
            )

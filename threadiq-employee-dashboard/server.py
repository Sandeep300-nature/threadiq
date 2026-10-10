"""
ThreadIQ Employee Inventory Dashboard - Unified Server Launcher
Runs FastAPI with Uvicorn on port 3000, serving both the REST/SSE backend and the dashboard frontend.
"""

import sys
import os

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIRECTORY)

import uvicorn
from backend.main import app

def run_server():
    print(f"===========================================================")
    print(f" ThreadIQ — Multi-Employee Real-Time Inventory Server")
    print(f" Accounts: EMP001 (Rahul Sharma · Mysuru Central)")
    print(f"           EMP002 (Priya Kumar · Brigade Road Flagship)")
    print(f" Serving live at: http://localhost:3000")
    print(f"===========================================================")
    uvicorn.run(app, host="0.0.0.0", port=3000, log_level="info")

if __name__ == '__main__':
    run_server()

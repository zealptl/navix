import os
import subprocess
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import DB_PATH
from routers import stars

app = FastAPI(title="Interstellar Travel Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stars.router)


@app.on_event("startup")
async def seed_if_needed() -> None:
    if not os.path.exists(DB_PATH):
        print("stars.db not found — running seed script …")
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "seed.py")],
            capture_output=False,
        )
        if result.returncode != 0:
            print("WARNING: seed script exited with errors.")


@app.get("/health")
async def health():
    return {"status": "ok"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import widgets

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dashboard API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(widgets.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}

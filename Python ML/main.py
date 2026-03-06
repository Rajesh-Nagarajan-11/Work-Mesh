from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers.team_formation import router as team_router
from routers.demand import router as demand_router

app = FastAPI(
    title="Work Mesh — ML Team Formation API",
    description=(
        "AI-powered team formation service using Cosine Similarity "
        "on skill vectors combined with ER-diagram factors: availability, "
        "performance, communication, teamwork, experience, error rate, "
        "and client feedback."
    ),
    version="2.0.0",
)

# CORS — allow the Node.js backend and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Frontend
        "http://localhost:5000",   # Node.js backend
        "http://localhost:5173",   # Vite dev server
        "*",                       # For development convenience
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(team_router)
app.include_router(demand_router)

# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "Work Mesh ML Team Formation",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "algorithm": {
            "type": "Cosine Similarity + Weighted Multi-Factor Scoring",
            "factors": {
                "skill_cosine_similarity": "40%",
                "availability":            "20%",
                "performance_rating":      "15%",
                "communication_score":     "8%",
                "teamwork_score":          "7%",
                "experience":              "5%",
                "error_rate":              "3%",
                "client_feedback":         "2%",
            },
        },
        "endpoints": {
            "POST /team/recommend":              "Score employees for custom requirements",
            "GET  /team/recommend/{project_id}": "Auto-recommend team for a project",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "work-mesh-ml"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

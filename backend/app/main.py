"""FastAPI application entry point."""

from fastapi import FastAPI

from app.routers import projects

app = FastAPI(title="AI-Powered API Test Generation Platform")

app.include_router(projects.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Basic liveness check."""
    return {"status": "ok"}
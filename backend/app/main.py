"""FastAPI application entry point."""

from fastapi import FastAPI

from app.routers import projects, reports, runs, test_cases, tickets, uploads


app = FastAPI(title="AI-Powered API Test Generation Platform")

app.include_router(projects.router)
app.include_router(tickets.router)
app.include_router(test_cases.router)
app.include_router(uploads.router)
app.include_router(runs.router)
app.include_router(reports.router)

@app.get("/health")
def health_check() -> dict[str, str]:
    """Basic liveness check."""
    return {"status": "ok"}
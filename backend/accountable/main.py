"""The FastAPI app (APP-2).

On start it brings the database up to date and, if the database is new, loads
the sample data.

Run with: uv run uvicorn accountable.main:app --host 127.0.0.1 --port 8000
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel

from accountable.core.db import make_engine, migrate
from accountable.core.settings import ALLOWED_HOSTS, db_path
from accountable.crm.router import router as crm_router
from accountable.seed import load_samples


class Health(BaseModel):
    status: str


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        engine = make_engine(db_path())
        migrate(engine, on_create=load_samples)
        app.state.engine = engine
        yield
        engine.dispose()

    app = FastAPI(title="Accountable", version="0.1.0", lifespan=lifespan)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)
    app.include_router(crm_router, prefix="/api")

    @app.get("/api/health", tags=["health"])
    def health() -> Health:
        return Health(status="ok")

    return app


app = create_app()

"""The FastAPI app (APP-2).

On start it brings the database up to date and, if the database file didn't
exist before this start, loads the sample data.

Run with: uv run uvicorn accountable.main:app --host 127.0.0.1 --port 8000
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from accountable.core.db import make_engine, migrate
from accountable.core.settings import db_path
from accountable.crm.router import router as crm_router


class Health(BaseModel):
    status: str


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        path = db_path()
        is_new = not path.exists()
        engine = make_engine(path)
        migrate(engine)
        if is_new:
            from accountable.seed import load_samples

            load_samples(engine)
        app.state.engine = engine
        yield
        engine.dispose()

    app = FastAPI(title="Accountable", version="0.1.0", lifespan=lifespan)
    app.include_router(crm_router, prefix="/api")

    @app.get("/api/health", tags=["health"])
    def health() -> Health:
        return Health(status="ok")

    return app


app = create_app()

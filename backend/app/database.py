"""SQLAlchemy engine, session factory, and declarative base."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, echo=settings.debug)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class that all ORM models inherit from."""

    pass


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for a single request, then close it.

    FastAPI calls this as a dependency. It opens a session before
    the request handler runs, hands it to the handler, and guarantees
    the session is closed afterward — even if the handler raises
    an exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
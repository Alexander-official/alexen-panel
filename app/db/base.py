from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import (
    SQLALCHEMY_DATABASE_URL,
    SQLALCHEMY_POOL_SIZE,
    SQLIALCHEMY_MAX_OVERFLOW,
)

IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith('sqlite')

if IS_SQLITE:
    # timeout: how long a write waits for a lock before giving up (default 5s was
    # too short on busy panels and surfaced as intermittent "database is busy" errors,
    # e.g. saving settings while subscription fetches keep writing sub_request_count).
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30}
    )

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):
        # WAL lets readers and one writer work at once (no whole-db lock like the
        # default rollback journal); busy_timeout keeps writers waiting instead of
        # erroring; synchronous=NORMAL is the safe, fast pairing for WAL.
        cur = dbapi_conn.cursor()
        try:
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA busy_timeout=30000")
            cur.execute("PRAGMA synchronous=NORMAL")
        finally:
            cur.close()
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=SQLALCHEMY_POOL_SIZE,
        max_overflow=SQLIALCHEMY_MAX_OVERFLOW,
        pool_recycle=3600,
        pool_timeout=10
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass

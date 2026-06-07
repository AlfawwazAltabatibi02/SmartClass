"""
database.py — MySQL connection pool for the smart_class database.
"""
from __future__ import annotations
import os
from contextlib import contextmanager
from typing import Generator

import mysql.connector
from mysql.connector import pooling

from config import settings

# Inside database.py
from config import settings

DB_CONFIG = {
    "host":     settings.db_host,
    "port":     settings.db_port, # Pull from config instead of hardcoding
    "user":     settings.db_user,
    "password": settings.db_pass,
    "database": settings.db_name,
    "charset":  "utf8mb4",
    "use_pure": True,
}

_pool: pooling.MySQLConnectionPool | None = None

print("!!! THE PASSWORD PYTHON IS USING IS:", os.getenv("DB_PASSWORD")) 
# (Or use settings.DB_PASSWORD if you are using your config file) 

def get_pool() -> pooling.MySQLConnectionPool:
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="academ_pool",
            pool_size=10,
            **DB_CONFIG,
        )
    return _pool

@contextmanager
def get_db() -> Generator[mysql.connector.MySQLConnection, None, None]:
    conn = get_pool().get_connection()
    try:
        yield conn
    finally:
        conn.close()

def db_available() -> bool:
    try:
        with get_db() as conn:
            conn.ping(reconnect=False)
        return True
    except Exception as e:
        # ADD THIS LINE TO YOUR CODE TO SEE THE ERROR IN THE TERMINAL
        print(f"DATABASE CONNECTION ERROR: {e}") 
        return False
from psycopg_pool import ConnectionPool
from app.config import Config

pool = ConnectionPool(conninfo=Config.DATABASE_URL, max_size=10, timeout=30)

def get_conn():
    return pool.connection()

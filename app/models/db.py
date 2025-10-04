from psycopg_pool import ConnectionPool
from app.config import Config

# Создаём пул подключений
pool = ConnectionPool(conninfo=Config.DATABASE_URL, max_size=10, timeout=30)

def get_conn():
    """Получить подключение из пула"""
    return pool.connection()

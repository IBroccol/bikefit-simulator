# Mock database implementation for testing
# This replaces the PostgreSQL connection pool with in-memory data structures

class MockConnection:
    """Mock connection object that mimics psycopg connection behavior"""
    
    def __init__(self):
        pass
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def cursor(self, row_factory=None):
        return MockCursor(row_factory=row_factory)
    
    def commit(self):
        """Mock commit - does nothing since we're using in-memory storage"""
        pass


class MockCursor:
    """Mock cursor object that mimics psycopg cursor behavior"""
    
    def __init__(self, row_factory=None):
        self.row_factory = row_factory
        self._result = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def execute(self, query, params=None):
        """Mock execute - stores query and params for processing in dao.py"""
        self._query = query
        self._params = params
        self._result = None
    
    def fetchone(self):
        """Returns single result"""
        return self._result
    
    def fetchall(self):
        """Returns all results"""
        return self._result if self._result else []


def get_conn():
    """Returns a mock connection instead of a real database connection"""
    return MockConnection()

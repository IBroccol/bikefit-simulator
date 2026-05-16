"""
Pytest configuration and fixtures for bikefit-simulator tests.

Uses mock_dao (in-memory) instead of a real PostgreSQL database so tests
can run without any external dependencies.

Strategy:
  1. Stub psycopg, psycopg.rows, psycopg_pool, app.config, app.models.db
     into sys.modules BEFORE any app package is imported.
  2. Load mock_db directly from its file path (bypassing app/__init__.py).
  3. Import mock_dao and dao normally — they are now safe.
  4. In the app() fixture, monkeypatch dao functions with mock_dao equivalents.
"""
import sys
import os
import types
import importlib.util
import pytest

# ---------------------------------------------------------------------------
# 1. Ensure the bikefit-simulator package root is on sys.path
# ---------------------------------------------------------------------------
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# ---------------------------------------------------------------------------
# 2. Stub out ALL third-party / DB modules that would fail at import time.
#    This must happen before ANY import that touches the 'app' package.
# ---------------------------------------------------------------------------

# psycopg
_fake_psycopg = types.ModuleType('psycopg')
_fake_psycopg_rows = types.ModuleType('psycopg.rows')
_fake_psycopg_rows.dict_row = None
_fake_psycopg.rows = _fake_psycopg_rows
sys.modules.setdefault('psycopg', _fake_psycopg)
sys.modules.setdefault('psycopg.rows', _fake_psycopg_rows)

# psycopg_pool
_fake_pool_mod = types.ModuleType('psycopg_pool')

class _FakePool:
    def __init__(self, *a, **kw): pass
    def connection(self): return None

_fake_pool_mod.ConnectionPool = _FakePool
sys.modules.setdefault('psycopg_pool', _fake_pool_mod)

# app.config (db.py imports it)
_fake_config_mod = types.ModuleType('app.config')

class _FakeConfig:
    DATABASE_URL = 'postgresql://fake/fake'

_fake_config_mod.Config = _FakeConfig
sys.modules.setdefault('app.config', _fake_config_mod)

# ---------------------------------------------------------------------------
# 3. Load mock_db directly from its file (avoids triggering app/__init__.py)
# ---------------------------------------------------------------------------
_mock_db_path = os.path.join(ROOT, 'app', 'models', 'mock_db.py')
_mock_db_spec = importlib.util.spec_from_file_location('_mock_db_direct', _mock_db_path)
_mock_db_direct = importlib.util.module_from_spec(_mock_db_spec)
_mock_db_spec.loader.exec_module(_mock_db_direct)

# ---------------------------------------------------------------------------
# 4. Stub app.models.db with mock get_conn BEFORE app package is imported
# ---------------------------------------------------------------------------
_fake_db_mod = types.ModuleType('app.models.db')
_fake_db_mod.get_conn = _mock_db_direct.get_conn
sys.modules['app.models.db'] = _fake_db_mod

# ---------------------------------------------------------------------------
# 5. Now it is safe to import app code
# ---------------------------------------------------------------------------
from app.models import mock_dao   # noqa: E402
import app.models.dao as _dao_module  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_mock_db():
    """Reset the in-memory mock database before every test."""
    mock_dao._mock_db = {
        "users": [],
        "bike_models": [],
        "bike_sizes": [],
        "anthropometry": [],
        "fit_settings": [],
    }
    mock_dao._counters = {
        "users": 1,
        "bike_models": 1,
        "bike_sizes": 1,
        "anthropometry": 1,
        "fit_settings": 1,
    }


@pytest.fixture()
def app(monkeypatch):
    """
    Create a Flask test application with mock_dao injected in place of the
    real dao so no database connection is required.
    """
    # Patch every public function in the real dao module with the mock version.
    # Only patch names that actually exist in _dao_module to avoid AttributeError
    # when mock_dao imports stdlib names like 'datetime' that dao.py doesn't expose.
    for name in dir(mock_dao):
        if name.startswith('_'):
            continue
        obj = getattr(mock_dao, name)
        if callable(obj) and hasattr(_dao_module, name):
            monkeypatch.setattr(_dao_module, name, obj)

    from app import create_app

    flask_app = create_app()
    flask_app.config.update({
        'TESTING': True,
        'SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
    })
    return flask_app


@pytest.fixture()
def client(app):
    """Flask test client."""
    return app.test_client()


@pytest.fixture()
def registered_user(client):
    """Register a test user and return their credentials."""
    credentials = {
        'username': 'testuser',
        'password': 'Password123!',
        'confirm_password': 'Password123!',
    }
    client.post('/auth/register', json=credentials)
    return credentials


@pytest.fixture()
def auth_client(client, registered_user):
    """Test client with an active session (logged-in user)."""
    client.post('/auth/login', json={
        'username': registered_user['username'],
        'password': registered_user['password'],
    })
    return client

import sys
import os
import types
import importlib.util
import pytest

ROOT = os.path.abspath(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

_fake_psycopg = types.ModuleType('psycopg')
_fake_psycopg_rows = types.ModuleType('psycopg.rows')
_fake_psycopg_rows.dict_row = None
_fake_psycopg.rows = _fake_psycopg_rows
sys.modules.setdefault('psycopg', _fake_psycopg)
sys.modules.setdefault('psycopg.rows', _fake_psycopg_rows)

_fake_pool_mod = types.ModuleType('psycopg_pool')

class _FakePool:
    def __init__(self, *a, **kw): pass
    def connection(self): return None

_fake_pool_mod.ConnectionPool = _FakePool
sys.modules.setdefault('psycopg_pool', _fake_pool_mod)

_fake_config_mod = types.ModuleType('app.config')

class _FakeConfig:
    DATABASE_URL = 'postgresql://fake/fake'

_fake_config_mod.Config = _FakeConfig
sys.modules.setdefault('app.config', _fake_config_mod)

_mock_db_path = os.path.join(ROOT, 'app', 'models', 'mock_db.py')
_mock_db_spec = importlib.util.spec_from_file_location('_mock_db_direct', _mock_db_path)
_mock_db_direct = importlib.util.module_from_spec(_mock_db_spec)
_mock_db_spec.loader.exec_module(_mock_db_direct)

_fake_db_mod = types.ModuleType('app.models.db')
_fake_db_mod.get_conn = _mock_db_direct.get_conn
sys.modules['app.models.db'] = _fake_db_mod

from app.models import mock_dao   # noqa: E402
import app.models.dao as _dao_module  # noqa: E402


@pytest.fixture(autouse=True)
def reset_mock_db():
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
    return app.test_client()


@pytest.fixture()
def registered_user(client):
    credentials = {
        'username': 'testuser',
        'password': 'Password123!',
        'confirm_password': 'Password123!',
    }
    client.post('/auth/register', json=credentials)
    return credentials


@pytest.fixture()
def auth_client(client, registered_user):
    client.post('/auth/login', json={
        'username': registered_user['username'],
        'password': registered_user['password'],
    })
    return client

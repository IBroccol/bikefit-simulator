"""
Integration tests for the bikefit-simulator Flask API.

All tests use the in-memory mock_dao — no PostgreSQL required.
Run with:  cd bikefit-simulator && pytest tests/ -v

Notes on actual Flask behavior:
- @auth_required always returns JSON 401 for unauthenticated requests (no more redirects)
- /fits/add_anthropometry returns 201 on success
- /fits/save returns 201 on success
- /fits/get_anthropometry returns 404 when no data exists
- /bikes/add validator checks numeric ranges but not model/size presence
"""
import json
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_BIKE = {
    "model": "Trek Domane SL 6",
    "size": "56",
    "seatTube": 560.0,
    "seatAngle": 73.0,
    "headTube": 150.0,
    "headAngle": 72.0,
    "bbdrop": 70.0,
    "chainstay": 410.0,
    "wheelbase": 1010.0,
    "stack": 560.0,
    "reach": 390.0,
    "rimD": 622.0,
    "tyreW": 28.0,
    "crankLen": 172.5,
    "stemLen": 100.0,
    "stemAngle": 6.0,
    "barReach": 80.0,
    "barDrop": 128.0,
    "saddleLen": 270.0,
}

VALID_ANTHRO = {
    "height": 175,
    "hip": 450,
    "lowerLeg": 400,
    "footLength": 260,
    "torsoMax": 500,
    "upperarm": 320,
    "forearm": 280,
}


# ===========================================================================
# Auth — /auth/register
# ===========================================================================

class TestRegister:
    def test_register_success(self, client):
        rv = client.post('/auth/register', json={
            'username': 'alice',
            'password': 'Secret123!',
            'confirm_password': 'Secret123!',
        })
        assert rv.status_code == 201
        data = rv.get_json()
        assert data['success'] is True

    def test_register_duplicate_username(self, client):
        payload = {'username': 'bob', 'password': 'Secret123!', 'confirm_password': 'Secret123!'}
        client.post('/auth/register', json=payload)
        rv = client.post('/auth/register', json=payload)
        assert rv.status_code in (400, 409)
        data = rv.get_json()
        assert data.get('success') is not True

    def test_register_password_mismatch(self, client):
        rv = client.post('/auth/register', json={
            'username': 'carol',
            'password': 'Secret123!',
            'confirm_password': 'Different!',
        })
        assert rv.status_code == 400

    def test_register_missing_fields(self, client):
        rv = client.post('/auth/register', json={'username': 'dave'})
        assert rv.status_code == 400

    def test_register_short_password(self, client):
        rv = client.post('/auth/register', json={
            'username': 'eve',
            'password': '123',
            'confirm_password': '123',
        })
        assert rv.status_code == 400


# ===========================================================================
# Auth — /auth/login
# ===========================================================================

class TestLogin:
    def test_login_success(self, client, registered_user):
        rv = client.post('/auth/login', json={
            'username': registered_user['username'],
            'password': registered_user['password'],
        })
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True

    def test_login_wrong_password(self, client, registered_user):
        rv = client.post('/auth/login', json={
            'username': registered_user['username'],
            'password': 'wrongpassword',
        })
        assert rv.status_code == 401

    def test_login_unknown_user(self, client):
        rv = client.post('/auth/login', json={
            'username': 'nobody',
            'password': 'Secret123!',
        })
        assert rv.status_code == 401

    def test_login_missing_fields(self, client):
        rv = client.post('/auth/login', json={'username': 'testuser'})
        assert rv.status_code == 400


# ===========================================================================
# Auth — /auth/logout
# ===========================================================================

class TestLogout:
    def test_logout_success(self, auth_client):
        rv = auth_client.get('/auth/logout')
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True

    def test_logout_clears_session(self, auth_client):
        auth_client.get('/auth/logout')
        # After logout, /auth/me should return 401
        rv = auth_client.get('/auth/me')
        assert rv.status_code == 401


# ===========================================================================
# Auth — /auth/me  (new endpoint)
# ===========================================================================

class TestMe:
    def test_me_authenticated(self, auth_client, registered_user):
        rv = auth_client.get('/auth/me')
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['username'] == registered_user['username']
        assert 'role' in data
        assert 'id' in data

    def test_me_unauthenticated(self, client):
        rv = client.get('/auth/me')
        assert rv.status_code == 401


# ===========================================================================
# Bikes — /bikes/add
# ===========================================================================

class TestBikesAdd:
    def test_add_bike_success(self, auth_client):
        rv = auth_client.post('/bikes/add', json=[VALID_BIKE])
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True

    def test_add_bike_unauthenticated(self, client):
        rv = client.post('/bikes/add', json=[VALID_BIKE])
        # @auth_required redirects unauthenticated requests (302)
        assert rv.status_code in (302, 401, 403)

    def test_add_bike_invalid_geometry_range(self, auth_client):
        # stack value below minimum (400) should fail validation
        bad_bike = {**VALID_BIKE, 'stack': 10.0}
        rv = auth_client.post('/bikes/add', json=[bad_bike])
        assert rv.status_code == 400
        data = rv.get_json()
        assert data.get('success') is not True

    def test_add_bike_empty_list(self, auth_client):
        # Empty list should fail validation
        rv = auth_client.post('/bikes/add', json=[])
        assert rv.status_code == 400

    def test_add_multiple_sizes(self, auth_client):
        size2 = {**VALID_BIKE, 'size': '58', 'seatTube': 580.0}
        rv = auth_client.post('/bikes/add', json=[VALID_BIKE, size2])
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True


# ===========================================================================
# Bikes — /bikes/user_bikes  and  /bikes/list
# ===========================================================================

class TestBikesList:
    def test_user_bikes_empty(self, auth_client):
        rv = auth_client.get('/bikes/user_bikes')
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True
        assert data['data'] == []

    def test_user_bikes_after_add(self, auth_client):
        auth_client.post('/bikes/add', json=[VALID_BIKE])
        rv = auth_client.get('/bikes/user_bikes')
        assert rv.status_code == 200
        data = rv.get_json()
        assert len(data['data']) == 1
        assert data['data'][0]['model'] == VALID_BIKE['model']

    def test_list_bikes_unauthenticated(self, client):
        # /bikes/list is @auth_required — redirects unauthenticated users
        rv = client.get('/bikes/list')
        assert rv.status_code in (200, 302, 401)

    def test_user_bikes_unauthenticated(self, client):
        # @auth_required redirects unauthenticated requests (302)
        rv = client.get('/bikes/user_bikes')
        assert rv.status_code in (302, 401, 403)


# ===========================================================================
# Bikes — /bikes/sizes
# ===========================================================================

class TestBikesSizes:
    def test_get_sizes(self, auth_client):
        auth_client.post('/bikes/add', json=[VALID_BIKE])
        # Get the bike id
        bikes_rv = auth_client.get('/bikes/user_bikes')
        bike_id = bikes_rv.get_json()['data'][0]['id']

        rv = auth_client.post('/bikes/sizes', json={'bike_model_id': bike_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['size'] == VALID_BIKE['size']


# ===========================================================================
# Bikes — /bikes/delete
# ===========================================================================

class TestBikesDelete:
    def test_delete_bike(self, auth_client):
        auth_client.post('/bikes/add', json=[VALID_BIKE])
        bikes_rv = auth_client.get('/bikes/user_bikes')
        bike_id = bikes_rv.get_json()['data'][0]['id']

        rv = auth_client.post('/bikes/delete', json={'bike_id': bike_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True

        # Verify it's gone
        bikes_rv2 = auth_client.get('/bikes/user_bikes')
        assert bikes_rv2.get_json()['data'] == []

    def test_delete_bike_unauthenticated(self, client):
        # @auth_required redirects unauthenticated requests (302)
        rv = client.post('/bikes/delete', json={'bike_id': 1})
        assert rv.status_code in (302, 401, 403)


# ===========================================================================
# Fits — /fits/add_anthropometry  and  /fits/get_anthropometry
# ===========================================================================

class TestAnthropometry:
    def test_add_anthropometry_success(self, auth_client):
        rv = auth_client.post('/fits/add_anthropometry', json=VALID_ANTHRO)
        # Route returns 201 on success
        assert rv.status_code == 201
        data = rv.get_json()
        assert data['success'] is True

    def test_get_anthropometry_after_add(self, auth_client):
        auth_client.post('/fits/add_anthropometry', json=VALID_ANTHRO)
        rv = auth_client.get('/fits/get_anthropometry')
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True
        assert data['data']['height'] == VALID_ANTHRO['height']

    def test_get_anthropometry_empty(self, auth_client):
        # Route returns 404 when no anthropometry data exists
        rv = auth_client.get('/fits/get_anthropometry')
        assert rv.status_code == 404
        data = rv.get_json()
        assert data.get('success') is False

    def test_add_anthropometry_unauthenticated(self, client):
        # @auth_required redirects unauthenticated requests (302)
        rv = client.post('/fits/add_anthropometry', json=VALID_ANTHRO)
        assert rv.status_code in (302, 401, 403)

    def test_add_anthropometry_missing_field(self, auth_client):
        bad = {k: v for k, v in VALID_ANTHRO.items() if k != 'height'}
        rv = auth_client.post('/fits/add_anthropometry', json=bad)
        assert rv.status_code == 400


# ===========================================================================
# Fits — /fits/save  and  /fits/list
# ===========================================================================

class TestFits:
    def _setup_bike_and_size(self, auth_client):
        """Helper: add a bike and return its size_id."""
        auth_client.post('/bikes/add', json=[VALID_BIKE])
        bikes_rv = auth_client.get('/bikes/user_bikes')
        bike_id = bikes_rv.get_json()['data'][0]['id']
        sizes_rv = auth_client.post('/bikes/sizes', json={'bike_model_id': bike_id})
        size_id = sizes_rv.get_json()['data'][0]['id']
        return bike_id, size_id

    def test_save_fit_success(self, auth_client):
        auth_client.post('/fits/add_anthropometry', json=VALID_ANTHRO)
        bike_id, size_id = self._setup_bike_and_size(auth_client)

        fit_payload = {
            'name': 'My fit',
            'size_id': size_id,
            'seatHight': 720.0,
            'stemHight': 50.0,
            'saddleOffset': 5.0,
            'torsoAngle': 45.0,
            'shifterAngle': 30.0,
        }
        rv = auth_client.post('/fits/save', json=fit_payload)
        # Route returns 201 on success
        assert rv.status_code == 201
        data = rv.get_json()
        assert data['success'] is True

    def test_list_fits(self, auth_client):
        auth_client.post('/fits/add_anthropometry', json=VALID_ANTHRO)
        bike_id, size_id = self._setup_bike_and_size(auth_client)

        fit_payload = {
            'name': 'My fit',
            'size_id': size_id,
            'seatHight': 720.0,
            'stemHight': 50.0,
            'saddleOffset': 5.0,
            'torsoAngle': 45.0,
            'shifterAngle': 30.0,
        }
        auth_client.post('/fits/save', json=fit_payload)

        rv = auth_client.post('/fits/list', json={'bike_id': bike_id, 'size_id': size_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['success'] is True
        assert 'My fit' in data['data']

    def test_save_fit_unauthenticated(self, client):
        # @auth_required redirects unauthenticated requests (302)
        rv = client.post('/fits/save', json={'name': 'x', 'size_id': 1})
        assert rv.status_code in (302, 401, 403)

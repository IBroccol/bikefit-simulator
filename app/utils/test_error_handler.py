import pytest


class TestErrorHandler:
    def test_empty_body_register(self, client):
        rv = client.post("/auth/register", json=None, content_type="application/json")
        assert rv.status_code == 400

    def test_empty_body_login(self, client):
        rv = client.post("/auth/login", json=None, content_type="application/json")
        assert rv.status_code == 400

    def test_empty_body_add_bike(self, auth_client):
        rv = auth_client.post("/bikes/add", json=None, content_type="application/json")
        assert rv.status_code == 400

    def test_empty_body_save_fit(self, auth_client):
        rv = auth_client.post("/fits/save", json=None, content_type="application/json")
        assert rv.status_code == 400

    def test_validation_error_returns_json(self, client):
        rv = client.post("/auth/register", json={
            "username": "x",
            "password": "short",
            "confirm_password": "short",
        })
        assert rv.status_code == 400
        data = rv.get_json()
        assert "errors" in data or "error" in data

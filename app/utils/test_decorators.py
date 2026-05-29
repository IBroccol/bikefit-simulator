import pytest


class TestDecorators:
    def test_role_required_wrong_role(self, auth_client):
        rv = auth_client.get("/bikes/pending")
        assert rv.status_code in (401, 403)

    def test_role_required_unauthenticated(self, client):
        rv = client.get("/bikes/pending")
        assert rv.status_code in (401, 403)

    def test_auth_required_unauthenticated(self, client):
        rv = client.get("/bikes/user_bikes")
        assert rv.status_code in (401, 403)

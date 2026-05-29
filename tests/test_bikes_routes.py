import pytest
from unittest.mock import patch, MagicMock

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
    "saddleRailLen": 60.0,
    "saddleHeight": 50.0,
    "maxStemHight": 50.0,
    "shifterReach": 70.0,
}


def _add_bike_get_size_id(auth_client):
    auth_client.post("/bikes/add", json=[VALID_BIKE])
    bikes = auth_client.get("/bikes/user_bikes").get_json()["data"]
    bike_id = bikes[0]["id"]
    sizes = auth_client.post("/bikes/sizes", json={"bike_model_id": bike_id}).get_json()["data"]
    return bike_id, sizes[0]["id"]


def _make_moderator(client):
    from app.models import mock_dao
    client.post("/auth/register", json={
        "username": "moduser",
        "password": "Moderator1!",
        "confirm_password": "Moderator1!",
    })
    user = mock_dao.get_user_by_username("moduser")
    user["role"] = "moderator"
    client.post("/auth/login", json={"username": "moduser", "password": "Moderator1!"})
    return client


class TestBikesGeometry:
    def test_get_geometry_success(self, auth_client):
        bike_id, size_id = _add_bike_get_size_id(auth_client)
        rv = auth_client.post("/bikes/geometry", json={"size_id": size_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["success"] is True
        assert "data" in data

    def test_get_geometry_unauthenticated(self, client):
        rv = client.post("/bikes/geometry", json={"size_id": 1})
        assert rv.status_code in (401, 403)

    def test_get_geometry_not_found(self, auth_client):
        rv = auth_client.post("/bikes/geometry", json={"size_id": 99999})
        assert rv.status_code == 404

    def test_get_geometry_missing_size_id(self, auth_client):
        rv = auth_client.post("/bikes/geometry", json={})
        assert rv.status_code == 400

    def test_get_geometry_other_user_bike_forbidden(self, app):
        with app.test_client() as c1:
            c1.post("/auth/register", json={
                "username": "user_a", "password": "Password1!", "confirm_password": "Password1!"
            })
            c1.post("/auth/login", json={"username": "user_a", "password": "Password1!"})
            c1.post("/bikes/add", json=[VALID_BIKE])
            bikes = c1.get("/bikes/user_bikes").get_json()["data"]
            bike_id = bikes[0]["id"]
            sizes = c1.post("/bikes/sizes", json={"bike_model_id": bike_id}).get_json()["data"]
            size_id = sizes[0]["id"]

        with app.test_client() as c2:
            c2.post("/auth/register", json={
                "username": "user_b", "password": "Password1!", "confirm_password": "Password1!"
            })
            c2.post("/auth/login", json={"username": "user_b", "password": "Password1!"})
            rv = c2.post("/bikes/geometry", json={"size_id": size_id})
            assert rv.status_code in (403, 404)


class TestBikesSizeId:
    def test_get_size_id_success(self, auth_client):
        _add_bike_get_size_id(auth_client)
        rv = auth_client.post("/bikes/id", json={
            "bike_model": VALID_BIKE["model"],
            "size": VALID_BIKE["size"],
        })
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["success"] is True
        assert isinstance(data["data"], int)

    def test_get_size_id_not_found(self, auth_client):
        rv = auth_client.post("/bikes/id", json={
            "bike_model": "Nonexistent Model",
            "size": "XL",
        })
        assert rv.status_code == 200
        data = rv.get_json()
        assert data.get("data") is None

    def test_get_size_id_missing_fields(self, auth_client):
        rv = auth_client.post("/bikes/id", json={"bike_model": "Trek"})
        assert rv.status_code == 400


class TestBikesSetPending:
    def test_set_pending_success(self, auth_client):
        bike_id, _ = _add_bike_get_size_id(auth_client)
        rv = auth_client.post("/bikes/set_pending", json={"bike_id": bike_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["success"] is True

    def test_set_pending_unauthenticated(self, client):
        rv = client.post("/bikes/set_pending", json={"bike_id": 1})
        assert rv.status_code in (401, 403)

    def test_set_pending_nonexistent(self, auth_client):
        rv = auth_client.post("/bikes/set_pending", json={"bike_id": 99999})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data.get("success") is False

    def test_set_pending_missing_bike_id(self, auth_client):
        rv = auth_client.post("/bikes/set_pending", json={})
        assert rv.status_code == 400


class TestModeratorRoutes:
    def test_pending_requires_moderator(self, auth_client):
        rv = auth_client.get("/bikes/pending")
        assert rv.status_code in (401, 403)

    def test_set_visibility_requires_moderator(self, auth_client):
        rv = auth_client.patch("/bikes/set_visibility", json={"bike_id": 1, "is_public": True})
        assert rv.status_code in (401, 403)

    def test_pending_as_moderator(self, app):
        with app.test_client() as c:
            c.post("/auth/register", json={
                "username": "reg_user", "password": "Password1!", "confirm_password": "Password1!"
            })
            c.post("/auth/login", json={"username": "reg_user", "password": "Password1!"})
            c.post("/bikes/add", json=[VALID_BIKE])
            bikes = c.get("/bikes/user_bikes").get_json()["data"]
            bike_id = bikes[0]["id"]
            c.post("/bikes/set_pending", json={"bike_id": bike_id})
            c.post("/auth/logout")

            _make_moderator(c)
            rv = c.get("/bikes/pending")
            assert rv.status_code == 200
            data = rv.get_json()
            assert data["success"] is True
            assert any(b["id"] == bike_id for b in data["data"])

    def test_set_visibility_approve(self, app):
        with app.test_client() as c:
            c.post("/auth/register", json={
                "username": "reg_user2", "password": "Password1!", "confirm_password": "Password1!"
            })
            c.post("/auth/login", json={"username": "reg_user2", "password": "Password1!"})
            c.post("/bikes/add", json=[VALID_BIKE])
            bikes = c.get("/bikes/user_bikes").get_json()["data"]
            bike_id = bikes[0]["id"]
            c.post("/bikes/set_pending", json={"bike_id": bike_id})
            c.post("/auth/logout")

            _make_moderator(c)
            rv = c.patch("/bikes/set_visibility", json={"bike_id": bike_id, "is_public": True})
            assert rv.status_code == 200
            data = rv.get_json()
            assert data["success"] is True

    def test_set_visibility_reject(self, app):
        with app.test_client() as c:
            c.post("/auth/register", json={
                "username": "reg_user3", "password": "Password1!", "confirm_password": "Password1!"
            })
            c.post("/auth/login", json={"username": "reg_user3", "password": "Password1!"})
            c.post("/bikes/add", json=[VALID_BIKE])
            bikes = c.get("/bikes/user_bikes").get_json()["data"]
            bike_id = bikes[0]["id"]
            c.post("/auth/logout")

            _make_moderator(c)
            rv = c.patch("/bikes/set_visibility", json={"bike_id": bike_id, "is_public": False})
            assert rv.status_code == 200
            data = rv.get_json()
            assert data["success"] is True

    def test_set_visibility_missing_fields(self, app):
        with app.test_client() as c:
            _make_moderator(c)
            rv = c.patch("/bikes/set_visibility", json={"bike_id": 1})
            assert rv.status_code == 400


class TestParseUrl:
    def test_parse_url_unauthenticated(self, client):
        rv = client.post("/bikes/parse_url", json={"url": "https://bikeinsights.com/bikes/trek"})
        assert rv.status_code in (401, 403)

    def test_parse_url_wrong_domain(self, auth_client):
        rv = auth_client.post("/bikes/parse_url", json={"url": "https://evil.com/bikes/trek"})
        assert rv.status_code == 400
        data = rv.get_json()
        assert "bikeinsights" in data.get("error", "").lower()

    def test_parse_url_missing_url(self, auth_client):
        rv = auth_client.post("/bikes/parse_url", json={})
        assert rv.status_code == 400

    def test_parse_url_empty_url(self, auth_client):
        rv = auth_client.post("/bikes/parse_url", json={"url": "   "})
        assert rv.status_code == 400

    def test_parse_url_network_error(self, auth_client):
        import urllib.error
        with patch("app.routes.bikes.urllib.request.urlopen",
                   side_effect=urllib.error.URLError("connection refused")):
            rv = auth_client.post("/bikes/parse_url",
                                  json={"url": "https://bikeinsights.com/bikes/trek"})
        assert rv.status_code == 502

    def test_parse_url_http_error(self, auth_client):
        import urllib.error
        err = urllib.error.HTTPError(
            url="https://bikeinsights.com/bikes/trek",
            code=404, msg="Not Found", hdrs=None, fp=None
        )
        with patch("app.routes.bikes.urllib.request.urlopen", side_effect=err):
            rv = auth_client.post("/bikes/parse_url",
                                  json={"url": "https://bikeinsights.com/bikes/trek"})
        assert rv.status_code == 502

    def test_parse_url_success(self, auth_client):
        fake_html = """
        <html><body>
        <script>
        var __NEXT_DATA__ = {"props":{"pageProps":{"bikeGeometries":[
            {"__typename":"BikeGeometry","size":"56","seatTube":560,"seatAngle":73,
             "headTube":150,"headAngle":72,"bbDrop":70,"chainstay":410,
             "wheelbase":1010,"stack":560,"reach":390,"crankLength":172.5,
             "stemLength":100,"stemAngle":6,"barReach":80,"barDrop":128}
        ],"bike":{"name":"Trek Domane SL 6"}}}};
        </script>
        </body></html>
        """
        mock_resp = MagicMock()
        mock_resp.read.return_value = fake_html.encode("utf-8")
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)

        with patch("app.routes.bikes.urllib.request.urlopen", return_value=mock_resp):
            rv = auth_client.post("/bikes/parse_url",
                                  json={"url": "https://bikeinsights.com/bikes/trek"})
        assert rv.status_code in (200, 422)

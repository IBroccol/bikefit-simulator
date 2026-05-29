import pytest

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

VALID_ANTHRO = {
    "height": 175,
    "hip": 450,
    "lowerLeg": 400,
    "footLength": 260,
    "torsoMax": 500,
    "upperarm": 320,
    "forearm": 280,
}


def _add_bike_get_size_id(auth_client):
    auth_client.post("/bikes/add", json=[VALID_BIKE])
    bikes = auth_client.get("/bikes/user_bikes").get_json()["data"]
    bike_id = bikes[0]["id"]
    sizes = auth_client.post("/bikes/sizes", json={"bike_model_id": bike_id}).get_json()["data"]
    return bike_id, sizes[0]["id"]


def _fit_payload(size_id):
    return {
        "name": "Test fit",
        "size_id": size_id,
        "seatHight": 720.0,
        "stemHight": 50.0,
        "saddleOffset": 5.0,
        "torsoAngle": 45.0,
        "shifterAngle": 30.0,
    }


class TestFitsBasic:
    def test_basic_fit_success(self, auth_client):
        auth_client.post("/fits/add_anthropometry", json=VALID_ANTHRO)
        bike_id, size_id = _add_bike_get_size_id(auth_client)
        rv = auth_client.post("/fits/basic", json={"size_id": size_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["success"] is True

    def test_basic_fit_no_anthropometry(self, auth_client):
        bike_id, size_id = _add_bike_get_size_id(auth_client)
        rv = auth_client.post("/fits/basic", json={"size_id": size_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["success"] is True
        assert data["data"] is None

    def test_basic_fit_invalid_size_id(self, auth_client):
        rv = auth_client.post("/fits/basic", json={"size_id": -1})
        assert rv.status_code in (400, 200)

    def test_basic_fit_nonexistent_size(self, auth_client):
        rv = auth_client.post("/fits/basic", json={"size_id": 99999})
        assert rv.status_code in (200, 400)
        data = rv.get_json()
        assert data.get("success") is False or data.get("data") is None

    def test_basic_fit_unauthenticated(self, client):
        rv = client.post("/fits/basic", json={"size_id": 1})
        assert rv.status_code in (401, 403)


class TestFitsGetAndDelete:
    def _setup(self, auth_client):
        auth_client.post("/fits/add_anthropometry", json=VALID_ANTHRO)
        bike_id, size_id = _add_bike_get_size_id(auth_client)
        auth_client.post("/fits/save", json=_fit_payload(size_id))
        return bike_id, size_id

    def test_get_fit_success(self, auth_client):
        bike_id, size_id = self._setup(auth_client)
        rv = auth_client.post("/fits/get", json={"fit_name": "Test fit", "size_id": size_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["success"] is True

    def test_get_fit_not_found(self, auth_client):
        bike_id, size_id = _add_bike_get_size_id(auth_client)
        rv = auth_client.post("/fits/get", json={"fit_name": "Nonexistent", "size_id": size_id})
        assert rv.status_code == 404

    def test_get_fit_missing_fields(self, auth_client):
        rv = auth_client.post("/fits/get", json={"fit_name": "x"})
        assert rv.status_code == 400

    def test_delete_fit_success(self, auth_client):
        bike_id, size_id = self._setup(auth_client)
        rv = auth_client.post("/fits/delete", json={"fit_name": "Test fit", "size_id": size_id})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["success"] is True

        rv2 = auth_client.post("/fits/get", json={"fit_name": "Test fit", "size_id": size_id})
        assert rv2.status_code == 404

    def test_delete_fit_unauthenticated(self, client):
        rv = client.post("/fits/delete", json={"fit_name": "x", "size_id": 1})
        assert rv.status_code in (401, 403)

    def test_delete_fit_missing_fields(self, auth_client):
        rv = auth_client.post("/fits/delete", json={"fit_name": "x"})
        assert rv.status_code == 400

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


class TestMockDaoUnit:
    def setup_method(self):
        from app.models import mock_dao
        self.dao = mock_dao
        mock_dao._mock_db = {
            "users": [], "bike_models": [], "bike_sizes": [],
            "anthropometry": [], "fit_settings": [],
        }
        mock_dao._counters = {k: 1 for k in mock_dao._mock_db}

    def test_create_and_get_user(self):
        self.dao.create_user_account("alice", "pass")
        user = self.dao.get_user_by_username("alice")
        assert user is not None
        assert user["username"] == "alice"

    def test_duplicate_user(self):
        self.dao.create_user_account("alice", "pass")
        result = self.dao.create_user_account("alice", "pass2")
        assert result["success"] is False

    def test_authenticate_user_success(self):
        self.dao.create_user_account("bob", "Secret1!")
        result = self.dao.authenticate_user("bob", "Secret1!")
        assert result is not None
        assert result["username"] == "bob"

    def test_authenticate_user_wrong_password(self):
        self.dao.create_user_account("bob", "Secret1!")
        result = self.dao.authenticate_user("bob", "wrong")
        assert result is None

    def test_authenticate_user_not_found(self):
        assert self.dao.authenticate_user("nobody", "pass") is None

    def test_get_user_by_id_not_found(self):
        assert self.dao.get_user_by_id(999) is None

    def test_add_bike_and_get_sizes(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        models = self.dao.get_user_bike_models(user["id"])
        assert len(models) == 1
        sizes = self.dao.get_bike_sizes(models[0]["id"])
        assert len(sizes) == 1
        assert sizes[0]["size"] == VALID_BIKE["size"]

    def test_add_bike_upsert_existing_size(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        updated = {**VALID_BIKE, "seatTube": 999.0}
        self.dao.add_user_bike(user["id"], updated)
        geo = self.dao.get_bike_geometry(1)
        assert geo["seatTube"] == 999.0

    def test_set_bike_visibility_approve(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        models = self.dao.get_user_bike_models(user["id"])
        bike_id = models[0]["id"]
        result = self.dao.set_bike_visibility(bike_id, True)
        assert result["success"] is True
        assert models[0]["status"] == "public"

    def test_set_bike_visibility_reject(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        models = self.dao.get_user_bike_models(user["id"])
        bike_id = models[0]["id"]
        result = self.dao.set_bike_visibility(bike_id, False)
        assert result["success"] is True
        assert models[0]["status"] == "private"

    def test_set_bike_visibility_not_found(self):
        result = self.dao.set_bike_visibility(99999, True)
        assert result["success"] is False

    def test_set_bike_pending(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        models = self.dao.get_user_bike_models(user["id"])
        bike_id = models[0]["id"]
        result = self.dao.set_bike_pending(bike_id, user["id"])
        assert result["success"] is True
        assert models[0]["status"] == "pending"

    def test_set_bike_pending_not_found(self):
        result = self.dao.set_bike_pending(99999, 1)
        assert result["success"] is False

    def test_get_pending_bikes(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        models = self.dao.get_user_bike_models(user["id"])
        self.dao.set_bike_pending(models[0]["id"], user["id"])
        pending = self.dao.get_pending_bikes()
        assert len(pending) == 1

    def test_get_bike_size_id(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        size_id = self.dao.get_bike_size_id(VALID_BIKE["model"], VALID_BIKE["size"])
        assert isinstance(size_id, int)

    def test_get_bike_size_id_not_found(self):
        assert self.dao.get_bike_size_id("Nonexistent", "XL") is None

    def test_save_and_get_fit(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        sizes = self.dao.get_bike_sizes(1)
        size_id = sizes[0]["id"]
        self.dao.save_fit_settings(user["id"], {
            "size_id": size_id, "name": "My fit",
            "seatHight": 720, "stemHight": 50,
            "saddleOffset": 5, "torsoAngle": 45, "shifterAngle": 30,
        })
        fit = self.dao.get_fit_by_name("My fit", size_id)
        assert fit is not None
        assert fit["name"] == "My fit"

    def test_get_fit_by_name_not_found(self):
        assert self.dao.get_fit_by_name("Nonexistent", 1) is None

    def test_get_user_fits(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        sizes = self.dao.get_bike_sizes(1)
        size_id = sizes[0]["id"]
        self.dao.save_fit_settings(user["id"], {
            "size_id": size_id, "name": "Fit A",
            "seatHight": 720, "stemHight": 50,
            "saddleOffset": 5, "torsoAngle": 45, "shifterAngle": 30,
        })
        fits = self.dao.get_user_fits(user["id"], size_id)
        assert "Fit A" in fits

    def test_delete_fit(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        sizes = self.dao.get_bike_sizes(1)
        size_id = sizes[0]["id"]
        self.dao.save_fit_settings(user["id"], {
            "size_id": size_id, "name": "Fit A",
            "seatHight": 720, "stemHight": 50,
            "saddleOffset": 5, "torsoAngle": 45, "shifterAngle": 30,
        })
        result = self.dao.delete_fit(user["id"], "Fit A", size_id)
        assert result["success"] is True
        assert self.dao.get_fit_by_name("Fit A", size_id) is None

    def test_add_and_get_anthropometry(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_anthropometry(user["id"], {"height": 175, "hip": 450})
        anthro = self.dao.get_latest_user_anthropometry(user["id"])
        assert anthro is not None
        assert anthro["height"] == 175

    def test_get_anthropometry_empty(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        assert self.dao.get_latest_user_anthropometry(user["id"]) is None

    def test_delete_user_bike(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        models = self.dao.get_user_bike_models(user["id"])
        bike_id = models[0]["id"]
        result = self.dao.delete_user_bike(user["id"], bike_id)
        assert result["success"] is True
        assert self.dao.get_user_bike_models(user["id"]) == []

    def test_delete_user_bike_not_found(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        result = self.dao.delete_user_bike(user["id"], 99999)
        assert result["success"] is False

    def test_get_visible_bike_models_includes_own_private(self):
        self.dao.create_user_account("u", "p")
        user = self.dao.get_user_by_username("u")
        self.dao.add_user_bike(user["id"], {**VALID_BIKE})
        visible = self.dao.get_visible_bike_models(user["id"])
        assert len(visible) == 1

    def test_get_visible_bike_models_excludes_other_private(self):
        self.dao.create_user_account("u1", "p")
        self.dao.create_user_account("u2", "p")
        u1 = self.dao.get_user_by_username("u1")
        u2 = self.dao.get_user_by_username("u2")
        self.dao.add_user_bike(u1["id"], {**VALID_BIKE})
        visible = self.dao.get_visible_bike_models(u2["id"])
        assert len(visible) == 0

    def test_get_visible_bike_models_includes_public(self):
        self.dao.create_user_account("u1", "p")
        self.dao.create_user_account("u2", "p")
        u1 = self.dao.get_user_by_username("u1")
        u2 = self.dao.get_user_by_username("u2")
        self.dao.add_user_bike(u1["id"], {**VALID_BIKE})
        models = self.dao.get_user_bike_models(u1["id"])
        self.dao.set_bike_visibility(models[0]["id"], True)
        visible = self.dao.get_visible_bike_models(u2["id"])
        assert len(visible) == 1

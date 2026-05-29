import pytest
from app.validators.fit_validator import (
    validate_anthropometry_data,
    validate_fit_settings_data,
    validate_fit_request_data,
    validate_size_id,
)

VALID_ANTHRO = {
    "height": 175,
    "hip": 450,
    "lowerLeg": 400,
    "footLength": 260,
    "torsoMax": 500,
    "upperarm": 320,
    "forearm": 280,
}


class TestValidateAnthropometryUnit:
    def _valid(self):
        return dict(VALID_ANTHRO)

    def test_valid_passes(self):
        r = validate_anthropometry_data(self._valid())
        assert r.is_valid

    def test_none_data(self):
        r = validate_anthropometry_data(None)
        assert not r.is_valid

    def test_empty_dict(self):
        r = validate_anthropometry_data({})
        assert not r.is_valid

    def test_missing_field(self):
        d = self._valid()
        del d["hip"]
        r = validate_anthropometry_data(d)
        assert not r.is_valid
        fields = [e["field"] for e in r.errors]
        assert "hip" in fields

    def test_negative_value(self):
        d = self._valid()
        d["hip"] = -10
        r = validate_anthropometry_data(d)
        assert not r.is_valid

    def test_below_min(self):
        d = self._valid()
        d["height"] = 50
        r = validate_anthropometry_data(d)
        assert not r.is_valid

    def test_above_max(self):
        d = self._valid()
        d["height"] = 300
        r = validate_anthropometry_data(d)
        assert not r.is_valid

    def test_lowerleg_not_greater_than_foot(self):
        d = self._valid()
        d["lowerLeg"] = d["footLength"]
        r = validate_anthropometry_data(d)
        assert not r.is_valid

    def test_torso_not_greater_than_lowerleg(self):
        d = self._valid()
        d["torsoMax"] = d["lowerLeg"]
        r = validate_anthropometry_data(d)
        assert not r.is_valid

    def test_arm_diff_too_large(self):
        d = self._valid()
        d["upperarm"] = 500
        d["forearm"] = 200
        r = validate_anthropometry_data(d)
        assert not r.is_valid

    def test_proportion_foot_too_small(self):
        d = self._valid()
        d["height"] = 175
        d["footLength"] = 200
        d["height"] = 200
        d["footLength"] = 200
        d["footLength"] = 199
        r = validate_anthropometry_data(d)
        assert not r.is_valid


class TestValidateFitSettingsUnit:
    def _valid(self, size_id=1):
        return {
            "size_id": size_id,
            "name": "My fit",
            "seatHight": 720.0,
            "stemHight": 50.0,
            "saddleOffset": 5.0,
            "torsoAngle": 45.0,
            "shifterAngle": 30.0,
        }

    def test_valid_passes(self):
        r = validate_fit_settings_data(self._valid())
        assert r.is_valid
        assert r.data["name"] == "My fit"

    def test_none_data(self):
        r = validate_fit_settings_data(None)
        assert not r.is_valid

    def test_missing_name(self):
        d = self._valid()
        del d["name"]
        r = validate_fit_settings_data(d)
        assert not r.is_valid

    def test_empty_name(self):
        d = self._valid()
        d["name"] = "   "
        r = validate_fit_settings_data(d)
        assert not r.is_valid

    def test_name_too_long(self):
        d = self._valid()
        d["name"] = "x" * 101
        r = validate_fit_settings_data(d)
        assert not r.is_valid

    def test_invalid_size_id(self):
        d = self._valid()
        d["size_id"] = -1
        r = validate_fit_settings_data(d)
        assert not r.is_valid

    def test_size_id_zero(self):
        d = self._valid()
        d["size_id"] = 0
        r = validate_fit_settings_data(d)
        assert not r.is_valid

    def test_missing_seat_hight(self):
        d = self._valid()
        del d["seatHight"]
        r = validate_fit_settings_data(d)
        assert not r.is_valid


class TestValidateFitRequestUnit:
    def test_valid(self):
        r = validate_fit_request_data({"fit_name": "My fit", "size_id": 1})
        assert r.is_valid
        assert r.data["fit_name"] == "My fit"

    def test_none(self):
        r = validate_fit_request_data(None)
        assert not r.is_valid

    def test_empty_fit_name(self):
        r = validate_fit_request_data({"fit_name": "", "size_id": 1})
        assert not r.is_valid

    def test_missing_size_id(self):
        r = validate_fit_request_data({"fit_name": "x"})
        assert not r.is_valid

    def test_negative_size_id(self):
        r = validate_fit_request_data({"fit_name": "x", "size_id": -5})
        assert not r.is_valid


class TestValidateSizeIdUnit:
    def test_valid(self):
        r = validate_size_id({"size_id": 3})
        assert r.is_valid
        assert r.data["size_id"] == 3

    def test_none(self):
        r = validate_size_id(None)
        assert not r.is_valid

    def test_missing(self):
        r = validate_size_id({})
        assert not r.is_valid

    def test_zero(self):
        r = validate_size_id({"size_id": 0})
        assert not r.is_valid

    def test_string(self):
        r = validate_size_id({"size_id": "abc"})
        assert not r.is_valid

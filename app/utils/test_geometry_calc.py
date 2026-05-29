import pytest
from app.utils.geometry_calc import basic_fit, _angle_by_sides, _cos_th, _dist

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

FULL_ANTHRO = {
    "height": 175,
    "footLength": 260,
    "hip": 450,
    "hipJointOffset": 66.5,
    "lowerLeg": 400,
    "heelToAnkle": 80.6,
    "ankleToMetatarsal": 153.4,
    "heelToMetatarsal": 174.2,
    "toes": 65.0,
    "soleHight": 45,
    "torsoMax": 500,
    "torsoMid": 490,
    "torsoMin": 437.5,
    "torsoMidAngle": 45,
    "torsoMinAngle": 10,
    "upperarm": 320,
    "forearm": 280,
    "neckLen": 166.25,
    "headR": 113.75,
}


class TestGeometryCalcUnit:
    def test_angle_by_sides_normal(self):
        angle = _angle_by_sides(1.0, 1.0, 1.0)
        assert abs(angle - 60.0) < 0.01

    def test_angle_by_sides_zero_denom(self):
        assert _angle_by_sides(0, 1, 1) is None
        assert _angle_by_sides(1, 0, 1) is None

    def test_cos_th_pythagorean(self):
        result = _cos_th(3, 4, 90)
        assert abs(result - 5.0) < 0.01

    def test_dist(self):
        assert abs(_dist((0, 0), (3, 4)) - 5.0) < 0.01
        assert abs(_dist((1, 1), (1, 1))) < 0.001

    def test_basic_fit_no_anthropometry(self):
        result = basic_fit(VALID_BIKE, None)
        assert "error" in result

    def test_basic_fit_empty_anthropometry(self):
        result = basic_fit(VALID_BIKE, {})
        assert "error" in result

    def test_basic_fit_success(self):
        result = basic_fit(VALID_BIKE, FULL_ANTHRO)
        assert "error" not in result
        assert "seatHight" in result
        assert "stemHight" in result
        assert "saddleOffset" in result
        assert "torsoAngle" in result
        assert "shifterAngle" in result
        assert result["shifterAngle"] == 30

    def test_basic_fit_missing_geometry_key(self):
        geo = {k: v for k, v in VALID_BIKE.items() if k != "crankLen"}
        result = basic_fit(geo, FULL_ANTHRO)
        assert "error" in result

    def test_basic_fit_missing_anthro_key(self):
        anthro = {k: v for k, v in FULL_ANTHRO.items() if k != "hip"}
        result = basic_fit(VALID_BIKE, anthro)
        assert "error" in result

    def test_basic_fit_string_fields_ignored(self):
        geo = {**VALID_BIKE, "size": "M", "model": "Trek"}
        result = basic_fit(geo, FULL_ANTHRO)
        assert "error" not in result

    def test_basic_fit_saddle_offset_clamped(self):
        geo = {**VALID_BIKE, "saddleRailLen": 1.0}
        result = basic_fit(geo, FULL_ANTHRO)
        if "error" not in result:
            assert result["saddleOffset"] <= 0.5

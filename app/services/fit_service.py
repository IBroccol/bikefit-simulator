import logging
from app.models import dao
from app.utils.geometry_calc import basic_fit
from app.validators.fit_validator import (
    validate_anthropometry_data,
    validate_fit_settings_data,
    validate_fit_request_data,
    validate_size_id,
)


def add_user_anthropometry(user_id, data):
    validation = validate_anthropometry_data(data)
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}

    d = validation.data
    converted = {
        "height":             d['height'],
        "footLength":         d['footLength'],
        "hip":                d['hip'],
        "hipJointOffset":     d['height'] * 0.38,
        "lowerLeg":           d['lowerLeg'],
        "heelToAnkle":        d['footLength'] * 0.31,
        "ankleToMetatarsal":  d['footLength'] * 0.59,
        "heelToMetatarsal":   d['footLength'] * 0.67,
        "toes":               d['footLength'] * 0.25,
        "soleHight":          45,
        "torsoMax":           d['torsoMax'],
        "torsoMid":           d['torsoMax'] * 0.98,
        "torsoMin":           d['torsoMax'] * 0.875,
        "torsoMidAngle":      45,
        "torsoMinAngle":      10,
        "upperarm":           d['upperarm'],
        "forearm":            d['forearm'],
        "neckLen":            d['height'] * 0.95,
        "headR":              d['height'] * 0.65,
    }
    return dao.add_user_anthropometry(user_id, converted)


logger = logging.getLogger(__name__)


def get_latest_user_anthropometry(user_id):
    return dao.get_latest_user_anthropometry(user_id)


def save_fit_settings(user_id, data):
    validation = validate_fit_settings_data(data)
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}
    return dao.save_fit_settings(user_id, validation.data)


def get_fit_by_name(name, size_id):
    validation = validate_fit_request_data({"fit_name": name, "size_id": size_id})
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}
    result = dao.get_fit_by_name(validation.data["fit_name"], validation.data["size_id"])
    if result:
        return {"success": True, "data": result}
    return {"success": False}


def get_user_fits(user_id, size_id):
    validation = validate_size_id({"size_id": size_id})
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}
    return dao.get_user_fits(user_id, validation.data["size_id"])


def get_basic_fit(size_id, user_id):
    validation = validate_size_id({"size_id": size_id})
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}

    bike_geo = dao.get_bike_geometry(validation.data["size_id"])
    if not bike_geo:
        return {"success": False, "errors": [{"field": "size_id", "message": "Геометрия велосипеда не найдена"}]}

    anthro = get_latest_user_anthropometry(user_id)
    result = basic_fit(bike_geo, anthro)

    if "error" in result:
        # Anthropometry not set — not a hard error, bike draws without fit overlay
        return None

    return result


def delete_fit(user_id, fit_name, size_id):
    validation = validate_fit_request_data({"fit_name": fit_name, "size_id": size_id})
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}
    return dao.delete_fit(user_id, validation.data["fit_name"], validation.data["size_id"])

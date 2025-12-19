from app.models import dao
from app.utils.geometry_calc import basic_fit
from app.validators.fit_validator import validate_anthropometry_data, validate_fit_settings_data, validate_fit_request_data

def add_user_anthropometry(user_id, data):
    validation_result = validate_anthropometry_data(data)
    
    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    converted = {
        "height": validation_result.data['height'],
        "footLength": validation_result.data['footLength'],

        "hip": validation_result.data["hip"],
        "hipJointOffset": validation_result.data['height'] * 0.38,
        "lowerLeg": validation_result.data["lowerLeg"],
        "heelToAnkle": validation_result.data["footLength"] * 0.31,
        "ankleToMetatarsal": validation_result.data["footLength"] * 0.59,
        "heelToMetatarsal": validation_result.data["footLength"] * 0.67,
        "toes": validation_result.data["footLength"] * 0.25,
        "soleHight": 45,

        "torsoMax": validation_result.data["torsoMax"],
        "torsoMid": validation_result.data["torsoMax"] * 0.98,
        "torsoMin": validation_result.data["torsoMax"] * 0.875,
        "torsoMidAngle": 45,
        "torsoMinAngle": 10,

        "upperarm": validation_result.data["upperarm"],
        "forearm": validation_result.data["forearm"],

        "neckLen": validation_result.data["height"] * 0.95,
        "headR": validation_result.data["height"] * 0.65,
    }

    return dao.add_user_anthropometry(user_id, converted)

def get_latest_user_anthropometry(user_id):
    return dao.get_latest_user_anthropometry(user_id)

def save_fit_settings(user_id, data):
    validation_result = validate_fit_settings_data(data)
    
    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    return dao.save_fit_settings(user_id, validation_result.data)

def get_fit_by_name(name, size_id):
    validation_data = {"fit_name": name, "size_id": size_id}
    validation_result = validate_fit_request_data(validation_data)
    
    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    result = dao.get_fit_by_name(validation_result.data["fit_name"], validation_result.data["size_id"])
    if result:
        return {"success": True, "data": result}
    return {"success": False}

def get_user_fits(user_id, size_id):
    validation_data = {"fit_name": "dummy", "size_id": size_id}
    validation_result = validate_fit_request_data(validation_data)
    
    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    return dao.get_user_fits(user_id, validation_result.data["size_id"])

def get_basic_fit(size_id, user_id):
    validation_data = {"fit_name": "dummy", "size_id": size_id}
    validation_result = validate_fit_request_data(validation_data)

    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    # Get bike geometry directly from DAO instead of through bike_service
    bike_geo = dao.get_bike_geometry(validation_result.data["size_id"])
    if not bike_geo:
        return {"success": False, "errors": [{"field": "size_id", "message": "Геометрия велосипеда не найдена"}]}
    
    anthro = get_latest_user_anthropometry(user_id)
    return basic_fit(bike_geo, anthro)

def delete_fit(user_id, fit_name, size_id):
    validation_data = {"fit_name": fit_name, "size_id": size_id}
    validation_result = validate_fit_request_data(validation_data)
    
    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    return dao.delete_fit(user_id, validation_result.data["fit_name"], validation_result.data["size_id"])

from app.models import dao
from app.utils.geometry_calc import basic_fit
from app.services.bike_service import get_bike_geometry

def add_user_anthropometry(user_id, data):
    converted = {
        "height": data['height'],
        "footLength": data['footLength'],

        "hip": data["hip"],
        "hipJointOffset": data['height'] * 0.38,
        "lowerLeg": data["lowerLeg"],
        "heelToAnkle": data["footLength"] * 0.31,
        "ankleToMetatarsal": data["footLength"] * 0.59,
        "heelToMetatarsal": data["footLength"] * 0.67,
        "toes": data["footLength"] * 0.25,
        "soleHight": 45,

        "torsoMax": data["torsoMax"],
        "torsoMid": data["torsoMax"] * 0.98,
        "torsoMin": data["torsoMax"] * 0.875,
        "torsoMidAngle": 45,
        "torsoMinAngle": 10,

        "upperarm": data["upperarm"],
        "forearm": data["forearm"],

        "neckLen": data["height"] * 0.95,
        "headR": data["height"] * 0.65,
    }

    return dao.add_user_anthropometry(user_id, converted)


def get_latest_user_anthropometry(user_id):
    return dao.get_latest_user_anthropometry(user_id)

def save_fit_settings(user_id, data):
    return dao.save_fit_settings(user_id, data)

def get_fit_by_name(name, bike_id):
    return dao.get_fit_by_name(name, bike_id)

def get_user_fits(user_id, bike_id):
    return dao.get_user_fits(user_id, bike_id)

def get_basic_fit(bike_id, user_id):
    bike_geo = get_bike_geometry(bike_id)
    anthro = get_latest_user_anthropometry(user_id)
    return basic_fit(bike_geo, anthro)

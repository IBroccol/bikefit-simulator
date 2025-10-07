from app.models import dao
from app.utils.geometry_calc import basic_fit
from app.services.bike_service import get_bike_geo

def add_anthro(user_id, data):
    converted = {
        "hip": data["hip"] * 10,
        "hipJointOffset": data['height'] * 0.38,
        "lowerLeg": data["lowerleg"] * 10,
        "heelToAnkle": data["footLength"] * 3.1,
        "ankleToMetatarsal": data["footLength"] * 5.9,
        "heelToMetatarsal": data["footLength"] * 6.7,
        "toes": data["footLength"] * 2.5,
        "soleHight": 45,

        "torsoMax": data["torsoLength"] * 10,
        "torsoMid": data["torsoLength"] * 9.8,
        "torsoMin": data["torsoLength"] * 8.75,
        "torsoMidAngle": 45,
        "torsoMinAngle": 10,

        "upperarm": data["upperarm"] * 10,
        "forearm": data["forearm"] * 10,

        "neckLen": data["height"] * 0.95,
        "headR": data["height"] * 0.65,
    }

    return dao.add_anthropometry(user_id, converted)


def get_anthro(user_id):
    return dao.get_anthro_by_user(user_id)

def save_fit(user_id, data):
    return dao.save_fit_settings(user_id, data)

def get_fit_by_name(name, bike_id):
    return dao.get_fit_by_name(name, bike_id)

def get_user_fits(user_id, bike_id):
    return dao.get_user_fits(user_id, bike_id)

def get_basic_fit(bike_id, user_id):
    bike_geo = get_bike_geo(bike_id)
    anthro = get_anthro(user_id)
    return basic_fit(bike_geo, anthro)

from app.models import dao

def add_bike(user_id, bike):
    return dao.add_bike(user_id, bike)

def get_bike_geo(bike_id):
    return dao.get_bike_geo(bike_id)

def get_user_bikes(user_id):
    return dao.get_user_bikes(user_id)

def get_bike_sizes(model):
    return dao.get_bike_sizes(model)

def get_bike_id(model, size):
    return dao.get_bike_id(model, size)

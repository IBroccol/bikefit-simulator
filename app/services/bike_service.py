from app.models import dao

def add_user_bike(user_id, bike):
    return dao.add_user_bike(user_id, bike)

def get_user_bike_models(user_id):
    return dao.get_user_bike_models(user_id)

def get_bike_geometry(bike_id):
    return dao.get_bike_geometry(bike_id)

def get_visiable_bike_models(user_id):
    return dao.get_visiable_bike_models(user_id)

def get_bike_sizes(model):
    return dao.get_bike_sizes(model)

def get_bike_size_id(model, size):
    return dao.get_bike_size_id(model, size)

def get_pending_bikes():
    return dao.get_pending_bikes()

def set_bike_visibility(bike_id, is_public):
    return dao.set_bike_visibility(bike_id, is_public)

def delete_user_bike(user_id, bike_id):
    return dao.delete_user_bike(user_id, bike_id)

def set_bike_pending(bike_id, user_id):
    return dao.set_bike_pending(bike_id, user_id)
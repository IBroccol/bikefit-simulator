from app.models import dao

def add_user_bike(user_id, bike):
    result = dao.add_user_bike(user_id, bike)
    return result

def get_user_bike_models(user_id):
    result = dao.get_user_bike_models(user_id)
    return {"success": True, "data": result}

def get_bike_geometry(size_id):
    result = dao.get_bike_geometry(size_id)
    if result:
        return {"success": True, "data": result}
    return {"success": False, "error": "Геометрия велосипеда не найдена"}

def get_visiable_bike_models(user_id):
    result = dao.get_visiable_bike_models(user_id)
    return {"success": True, "data": result}

def get_bike_sizes(bike_model_id):
    result = dao.get_bike_sizes(bike_model_id)
    return {"success": True, "data": result}

def get_bike_size_id(model, size):
    result = dao.get_bike_size_id(model, size)
    if result:
        return {"success": True, "data": result}
    return {"success": False, "error": "Размер велосипеда не найден"}

def get_pending_bikes():
    result = dao.get_pending_bikes()
    return {"success": True, "data": result}

def set_bike_visibility(bike_id, is_public):
    result = dao.set_bike_visibility(bike_id, is_public)
    return result

def delete_user_bike(user_id, bike_id):
    result = dao.delete_user_bike(user_id, bike_id)
    return result

def set_bike_pending(bike_id, user_id):
    result = dao.set_bike_pending(bike_id, user_id)
    return result
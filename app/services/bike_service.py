from app.models import dao
from app.validators.bike_validator import validate_bike_data
from app.utils.error_handler import ValidationError


def add_user_bike(user_id, bikes):
    validation = validate_bike_data(bikes)
    if not validation.is_valid:
        raise ValidationError(validation.errors)

    last_result = {"success": False, "error": "Нет данных для сохранения"}
    for bike in validation.data:
        result = dao.add_user_bike(user_id, bike)
        if not result.get("success"):
            return result
        last_result = result

    return last_result


def get_user_bike_models(user_id):
    return {"success": True, "data": dao.get_user_bike_models(user_id)}


def get_bike_geometry(size_id):
    result = dao.get_bike_geometry(size_id)
    if result:
        return {"success": True, "data": result}
    return {"success": False, "error": "Геометрия велосипеда не найдена"}


def get_visible_bike_models(user_id):
    return {"success": True, "data": dao.get_visible_bike_models(user_id)}


def get_bike_sizes(bike_model_id):
    return {"success": True, "data": dao.get_bike_sizes(bike_model_id)}


def get_bike_size_id(model, size):
    result = dao.get_bike_size_id(model, size)
    if result:
        return {"success": True, "data": result}
    return {"success": False, "error": "Размер велосипеда не найден"}


def get_pending_bikes():
    return {"success": True, "data": dao.get_pending_bikes()}


def set_bike_visibility(bike_id, is_public):
    return dao.set_bike_visibility(bike_id, is_public)


def delete_user_bike(user_id, bike_id):
    return dao.delete_user_bike(user_id, bike_id)


def set_bike_pending(bike_id, user_id):
    return dao.set_bike_pending(bike_id, user_id)

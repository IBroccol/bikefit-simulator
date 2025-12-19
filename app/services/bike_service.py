from app.models import dao
from app.validators.bike_validator import validate_bike_data
from app.utils.error_handler import ValidationError

def add_user_bike(user_id, bikes):
    # Валидация данных велосипеда
    validation_result = validate_bike_data(bikes)
    
    if not validation_result.is_valid:
        raise ValidationError(validation_result.errors)
    
    # Добавляем каждый размер велосипеда
    results = []
    for bike in validation_result.data:
        result = dao.add_user_bike(user_id, bike)
        results.append(result)
    
    # Возвращаем результат последней операции (все успешны или будет исключение)
    return results[-1] if results else {"success": False, "error": "Нет данных для сохранения"}

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
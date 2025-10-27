from app.models import dao
from app.validators.auth_validator import validate_register_data, validate_login_data

def create_user_account(username, password):
    validation_data = {"username": username, "password": password}
    validation_result = validate_register_data(validation_data)
    
    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    return dao.create_user_account(validation_result.data["username"], validation_result.data["password"])

def authenticate_user(username, password):
    validation_data = {"username": username, "password": password}
    validation_result = validate_login_data(validation_data)
    
    if not validation_result.is_valid:
        return {"success": False, "errors": validation_result.errors}
    
    user = dao.authenticate_user(validation_result.data["username"], validation_result.data["password"])
    
    if user is None:
        return {"success": False, "error": "Неверные учетные данные"}
    
    return {"success": True, "user": user}

def get_user_by_username(username):
    return dao.get_user_by_username(username)

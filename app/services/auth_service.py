from app.models import dao
from app.validators.auth_validator import validate_register_data, validate_login_data


def create_user_account(username, password, confirm_password=None):
    validation = validate_register_data({"username": username, "password": password, "confirm_password": confirm_password})
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}
    return dao.create_user_account(validation.data["username"], validation.data["password"])


def authenticate_user(username, password):
    validation = validate_login_data({"username": username, "password": password})
    if not validation.is_valid:
        return {"success": False, "errors": validation.errors}
    user = dao.authenticate_user(validation.data["username"], validation.data["password"])
    if user is None:
        return {"success": False, "error": "Неверные учетные данные"}
    return {"success": True, "user": user}

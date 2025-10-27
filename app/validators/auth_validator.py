import re
from typing import Dict, Any, Optional

class ValidationError:
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message

class ValidationResult:
    def __init__(self, is_valid: bool, errors: Optional[list] = None, data: Optional[Dict[str, Any]] = None):
        self.is_valid = is_valid
        self.errors = errors or []
        self.data = data or {}

    def add_error(self, field: str, message: str):
        self.errors.append({"field": field, "message": message})
        self.is_valid = False

def validate_register_data(data: Dict[str, Any]) -> ValidationResult:
    result = ValidationResult(True)
    
    if not data:
        result.add_error("data", "Отсутствуют данные запроса")
        return result
    
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    # Валидация имени пользователя
    if not username:
        result.add_error("username", "Имя пользователя обязательно")
    elif len(username) < 3:
        result.add_error("username", "Имя пользователя должно содержать не менее 3 символов")
    elif len(username) > 50:
        result.add_error("username", "Имя пользователя должно содержать не более 50 символов")
    elif not re.match(r'^[a-zA-Z0-9_]+$', username):
        result.add_error("username", "Имя пользователя может содержать только буквы латинского алфавита, цифры и нижние подчеркивания")
    elif username.startswith('_') or username.endswith('_'):
        result.add_error("username", "Имя пользователя не может начинаться или заканчиваться нижним подчеркиванием")
    elif '__' in username:
        result.add_error("username", "Имя пользователя не может содержать двойное нижнее подчеркивание")
    
    # Валидация пароля
    if not password:
        result.add_error("password", "Пароль обязателен")
    elif len(password) < 8:
        result.add_error("password", "Пароль должен содержать не менее 8 символов")
    elif len(password) > 100:
        result.add_error("password", "Пароль должен содержать не более 100 символа")
    elif not re.search(r'[a-z]', password):
        result.add_error("password", "Пароль должен содержать хотя бы одну строчную букву")
    elif not re.search(r'[A-Z]', password):
        result.add_error("password", "Пароль должен содержать хотя бы одну заглавную букву")
    elif not re.search(r'\d', password):
        result.add_error("password", "Пароль должен содержать хотя бы одну цифру")
    elif not re.search(r'[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]', password):
        result.add_error("password", "Пароль должен содержать хотя бы один специальный символ")
    elif re.search(r'(.)\1{2,}', password):
        result.add_error("password", "Пароль не может содержать три одинаковых символа подряд")
    elif username.lower() in password.lower():
        result.add_error("password", "Пароль не может содержать имя пользователя")
    
    if result.is_valid:
        result.data = {"username": username, "password": password}
    
    return result

def validate_login_data(data: Dict[str, Any]) -> ValidationResult:
    result = ValidationResult(True)
    
    if not data:
        result.add_error("data", "Отсутствуют данные запроса")
        return result
    
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username:
        result.add_error("username", "Имя пользователя обязательно")
    elif len(username) < 1:
        result.add_error("username", "Имя пользователя не может быть пустым")
    elif len(username) > 50:
        result.add_error("username", "Имя пользователя должно содержать максимум 50 символа")
    
    if not password:
        result.add_error("password", "Пароль обязателен")
    elif len(password) < 1:
        result.add_error("password", "Пароль не может быть пустым")
    
    if result.is_valid:
        result.data = {"username": username, "password": password}
    
    return result
"""
Централизованная система обработки ошибок для приложения BikeFit.
Обеспечивает единообразную обработку и форматирование ошибок.
"""

from functools import wraps
from flask import jsonify
import logging
from typing import Dict, Any, Optional, List

# Настройка логирования
logger = logging.getLogger(__name__)


class AppError(Exception):
    """Базовый класс для ошибок приложения"""
    def __init__(self, message: str, status_code: int = 400, field: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.field = field
        super().__init__(self.message)


class ValidationError(AppError):
    """Ошибка валидации данных"""
    def __init__(self, errors: List[Dict[str, str]]):
        self.errors = errors
        super().__init__("Ошибка валидации данных", status_code=400)


class NotFoundError(AppError):
    """Ресурс не найден"""
    def __init__(self, message: str = "Ресурс не найден"):
        super().__init__(message, status_code=404)


class UnauthorizedError(AppError):
    """Ошибка авторизации"""
    def __init__(self, message: str = "Неверные учетные данные"):
        super().__init__(message, status_code=401)


class ForbiddenError(AppError):
    """Доступ запрещен"""
    def __init__(self, message: str = "Доступ запрещен"):
        super().__init__(message, status_code=403)


class DatabaseError(AppError):
    """Ошибка базы данных"""
    def __init__(self, message: str = "Ошибка при работе с базой данных"):
        super().__init__(message, status_code=500)


def format_error_response(error: Exception, include_details: bool = False) -> Dict[str, Any]:
    """
    Форматирует ошибку в стандартный JSON-ответ.
    
    Args:
        error: Исключение для форматирования
        include_details: Включать ли технические детали (только для разработки)
    
    Returns:
        Словарь с форматированной ошибкой
    """
    if isinstance(error, ValidationError):
        return {
            "success": False,
            "errors": error.errors
        }
    
    if isinstance(error, AppError):
        response = {
            "success": False,
            "error": error.message
        }
        if error.field:
            response["field"] = error.field
        return response
    
    # Для неожиданных ошибок не показываем детали пользователю
    logger.error(f"Неожиданная ошибка: {str(error)}", exc_info=True)
    
    response = {
        "success": False,
        "error": "Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте позже."
    }
    
    # В режиме разработки можно включить детали
    if include_details:
        response["details"] = str(error)
        response["type"] = type(error).__name__
    
    return response


def handle_errors(func):
    """
    Декоратор для автоматической обработки ошибок в роутах.
    Перехватывает все исключения и возвращает стандартизированный JSON-ответ.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            return jsonify(format_error_response(e)), 400
        except UnauthorizedError as e:
            return jsonify(format_error_response(e)), 401
        except ForbiddenError as e:
            return jsonify(format_error_response(e)), 403
        except NotFoundError as e:
            return jsonify(format_error_response(e)), 404
        except DatabaseError as e:
            return jsonify(format_error_response(e)), 500
        except AppError as e:
            return jsonify(format_error_response(e)), e.status_code
        except Exception as e:
            # Логируем неожиданную ошибку
            logger.exception("Неожиданная ошибка в роуте")
            return jsonify(format_error_response(e)), 500
    
    return wrapper


def validate_request_data(data: Any, required_fields: Optional[List[str]] = None) -> None:
    """
    Проверяет наличие данных запроса и обязательных полей.
    
    Args:
        data: Данные запроса для проверки
        required_fields: Список обязательных полей
    
    Raises:
        ValidationError: Если данные отсутствуют или не хватает обязательных полей
    """
    if not data:
        raise ValidationError([{"field": "data", "message": "Отсутствуют данные запроса"}])
    
    if required_fields:
        errors = []
        for field in required_fields:
            if field not in data or data[field] is None:
                errors.append({
                    "field": field,
                    "message": f"Поле {field} обязательно"
                })
        
        if errors:
            raise ValidationError(errors)


def safe_database_operation(operation_name: str = "операция"):
    """
    Декоратор для безопасного выполнения операций с базой данных.
    Перехватывает исключения БД и преобразует их в понятные пользователю сообщения.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Ошибка БД при выполнении {operation_name}: {str(e)}", exc_info=True)
                raise DatabaseError(f"Не удалось выполнить {operation_name}")
        return wrapper
    return decorator
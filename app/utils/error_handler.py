from functools import wraps
from flask import jsonify
from werkzeug.exceptions import HTTPException
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, field: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.field = field
        super().__init__(self.message)


class ValidationError(AppError):
    def __init__(self, errors: List[Dict[str, str]]):
        self.errors = errors
        super().__init__("Ошибка валидации данных", status_code=400)


class NotFoundError(AppError):
    def __init__(self, message: str = "Ресурс не найден"):
        super().__init__(message, status_code=404)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Неверные учетные данные"):
        super().__init__(message, status_code=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Доступ запрещен"):
        super().__init__(message, status_code=403)


class DatabaseError(AppError):
    def __init__(self, message: str = "Ошибка при работе с базой данных"):
        super().__init__(message, status_code=500)


def _format_error(error: Exception) -> Dict[str, Any]:
    if isinstance(error, ValidationError):
        return {"success": False, "errors": error.errors}
    if isinstance(error, AppError):
        response = {"success": False, "error": error.message}
        if error.field:
            response["field"] = error.field
        return response
    logger.error(f"Неожиданная ошибка: {error}", exc_info=True)
    return {"success": False, "error": "Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте позже."}


def handle_errors(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            return jsonify(_format_error(e)), 400
        except UnauthorizedError as e:
            return jsonify(_format_error(e)), 401
        except ForbiddenError as e:
            return jsonify(_format_error(e)), 403
        except NotFoundError as e:
            return jsonify(_format_error(e)), 404
        except DatabaseError as e:
            return jsonify(_format_error(e)), 500
        except AppError as e:
            return jsonify(_format_error(e)), e.status_code
        except HTTPException as e:
            return jsonify({"success": False, "error": e.description}), e.code
        except Exception as e:
            logger.exception("Неожиданная ошибка в роуте")
            return jsonify(_format_error(e)), 500
    return wrapper


def validate_request_data(data: Any, required_fields: Optional[List[str]] = None) -> None:
    if not data:
        raise ValidationError([{"field": "data", "message": "Отсутствуют данные запроса"}])
    if required_fields:
        errors = [
            {"field": f, "message": f"Поле {f} обязательно"}
            for f in required_fields
            if f not in data or data[f] is None
        ]
        if errors:
            raise ValidationError(errors)

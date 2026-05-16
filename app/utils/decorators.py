from functools import wraps
from flask import session, request, jsonify


def auth_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401
        return func(*args, **kwargs)
    return wrapper


def role_required(required_role):
    def wrapper(func):
        @auth_required
        @wraps(func)
        def wrapper_1(*args, **kwargs):
            if "user_role" not in session:
                return jsonify({"error": "Нет информации о правах пользователя"}), 403

            user_role = session.get("user_role")
            if user_role != required_role:
                return jsonify({"error": "Недостаточно прав"}), 403
            return func(*args, **kwargs)
        return wrapper_1
    return wrapper

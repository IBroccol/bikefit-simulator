from flask import Blueprint, request, jsonify, session
from app.services import auth_service

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        
        if not data:
            return jsonify({"success": False, "error": "Отсутствуют данные запроса"}), 400
            
        result = auth_service.create_user_account(data.get("username"), data.get("password"))
        
        if result.get("success"):
            return jsonify(result), 201
        else:
            if "errors" in result:
                return jsonify({"success": False, "errors": result["errors"]}), 400
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        
        if not data:
            return jsonify({"success": False, "error": "Отсутствуют данные запроса"}), 400
            
        result = auth_service.authenticate_user(data.get("username"), data.get("password"))
        
        if result.get("success"):
            session["user_id"] = result["user"]["id"]
            session["user_role"] = result["user"]["role"]
            return jsonify({"success": True, "message": "Авторизация успешна"}), 200
        else:
            if "errors" in result:
                return jsonify({"success": False, "errors": result["errors"]}), 400
            return jsonify(result), 401
            
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500

@auth_bp.route("/logout", methods=["GET"])
def logout():
    try:
        session.pop("user_id", None)
        session.pop("user_role", None)
        return jsonify({"success": True, "message": "Выход выполнен"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500
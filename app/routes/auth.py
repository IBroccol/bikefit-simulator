from flask import Blueprint, request, jsonify, session
from app.services import auth_service
from app.utils.error_handler import handle_errors, validate_request_data, ValidationError

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.route("/register", methods=["POST"])
@handle_errors
def register():
    data = request.json
    validate_request_data(data)
    
    result = auth_service.create_user_account(
        data.get("username"),
        data.get("password"),
        data.get("confirm_password")
    )
    
    if result.get("success"):
        return jsonify(result), 201
    
    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify(result), 400

@auth_bp.route("/login", methods=["POST"])
@handle_errors
def login():
    data = request.json
    validate_request_data(data)
    
    result = auth_service.authenticate_user(data.get("username"), data.get("password"))
    
    if result.get("success"):
        session["user_id"] = result["user"]["id"]
        session["user_role"] = result["user"]["role"]
        return jsonify({"success": True, "message": "Авторизация успешна"}), 200
    
    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify(result), 401

@auth_bp.route("/logout", methods=["GET"])
@handle_errors
def logout():
    session.pop("user_id", None)
    session.pop("user_role", None)
    return jsonify({"success": True, "message": "Выход выполнен"}), 200
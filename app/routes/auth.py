from flask import Blueprint, request, jsonify, session
from app.services import auth_service

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    result = auth_service.register_user(data["username"], data["password"])
    return jsonify(result)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    user = auth_service.login_user(data["username"], data["password"])
    if user:
        session["user_id"] = user["id"]
        return jsonify({"message": "login success"})
    return jsonify({"error": "invalid credentials"}), 401

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return True


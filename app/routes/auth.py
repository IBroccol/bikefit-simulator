from flask import Blueprint, request, jsonify
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
    print("Received login:", data)
    result = auth_service.login_user(data["username"], data["password"])
    print("Result:", result)
    return jsonify(result)


@auth_bp.route("/logout", methods=["POST"])
def logout():
    result = auth_service.logout_user()
    return jsonify(result)

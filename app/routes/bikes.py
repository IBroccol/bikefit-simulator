from flask import Blueprint, request, jsonify, session
from app.services import bike_service

bikes_bp = Blueprint("bikes", __name__, url_prefix="/bikes")

@bikes_bp.route("/add", methods=["POST"])
def add_bike():
    user_id = session.get("user_id")
    data = request.json
    for bike_data in data:
        result = bike_service.add_bike(user_id, bike_data)
    return jsonify(result)

@bikes_bp.route("/list", methods=["GET"])
def list_user_bikes():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "unauthorized"}), 401
    result = bike_service.get_user_bikes(user_id)
    return jsonify(result)

@bikes_bp.route("/sizes", methods=["POST"])
def get_bike_sizes():
    model = request.json.get("bike_model")
    result = bike_service.get_bike_sizes(model)
    return jsonify(result)

@bikes_bp.route("/id", methods=["POST"])
def get_bike_id():
    model = request.json.get("bike_model")
    size = request.json.get("size")
    result = bike_service.get_bike_id(model, size)
    return jsonify(result)

@bikes_bp.route("/geo", methods=["POST"])
def get_bike_geo():
    bike_id = request.json.get("bike_id")
    result = bike_service.get_bike_geo(bike_id)
    return jsonify(result)

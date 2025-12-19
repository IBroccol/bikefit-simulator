from flask import Blueprint, request, jsonify, session
from app.services import bike_service
from app.utils.decorators import role_required, auth_required
from app.utils.error_handler import handle_errors, validate_request_data

bikes_bp = Blueprint("bikes", __name__, url_prefix="/bikes")

@bikes_bp.route("/add", methods=["POST"])
@auth_required
@handle_errors
def add_bike():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data)
    
    # Передаем весь массив велосипедов для валидации
    result = bike_service.add_user_bike(user_id, data)
    
    return jsonify(result)

@bikes_bp.route("/list", methods=["GET"])
@auth_required
@handle_errors
def list_visiable_bikes():
    user_id = session.get("user_id")
    result = bike_service.get_visiable_bike_models(user_id)
    return jsonify(result)

@bikes_bp.route("/user_bikes", methods=["GET"])
@auth_required
@handle_errors
def list_user_bikes():
    user_id = session.get("user_id")
    result = bike_service.get_user_bike_models(user_id)
    return jsonify(result)

@bikes_bp.route("/sizes", methods=["POST"])
@handle_errors
def get_bike_sizes():
    data = request.json
    validate_request_data(data, ["bike_model_id"])
    
    bike_model_id = data.get("bike_model_id")
    result = bike_service.get_bike_sizes(bike_model_id)
    return jsonify(result)

@bikes_bp.route("/id", methods=["POST"])
@handle_errors
def get_bike_size_id():
    data = request.json
    validate_request_data(data, ["bike_model", "size"])
    
    model = data.get("bike_model")
    size = data.get("size")
    result = bike_service.get_bike_size_id(model, size)
    return jsonify(result)

@bikes_bp.route("/geometry", methods=["POST"])
@handle_errors
def get_bike_geometry():
    data = request.json
    validate_request_data(data, ["size_id"])
    
    size_id = data.get("size_id")
    result = bike_service.get_bike_geometry(size_id)
    return jsonify(result)

@bikes_bp.route("/pending", methods=["GET"])
@role_required("moderator")
@handle_errors
def get_pending_bikes():
    data = bike_service.get_pending_bikes()
    return jsonify(data)

@bikes_bp.route("/set_visibility", methods=["POST"])
@role_required("moderator")
@handle_errors
def set_bike_visibility():
    data = request.json
    validate_request_data(data, ["bike_id", "is_public"])
    
    bike_id = data.get("bike_id")
    is_public = data.get("is_public")
    result = bike_service.set_bike_visibility(bike_id, is_public)
    return jsonify(result)

@bikes_bp.route("/set_pending", methods=["POST"])
@auth_required
@handle_errors
def set_bike_pending():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data, ["bike_id"])
    
    bike_id = data.get("bike_id")
    result = bike_service.set_bike_pending(bike_id, user_id)
    return jsonify(result)

@bikes_bp.route("/delete", methods=["POST"])
@auth_required
@handle_errors
def delete_bike():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data, ["bike_id"])
    
    bike_id = data.get("bike_id")
    result = bike_service.delete_user_bike(user_id, bike_id)
    return jsonify(result)
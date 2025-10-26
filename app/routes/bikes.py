from flask import Blueprint, request, jsonify, session
from app.services import bike_service
from app.utils.decorators import role_required, auth_required

bikes_bp = Blueprint("bikes", __name__, url_prefix="/bikes")

@bikes_bp.route("/add", methods=["POST"])
@auth_required
def add_bike():
    user_id = session.get("user_id")
    data = request.json
    for bike_data in data:
        result = bike_service.add_user_bike(user_id, bike_data)
    return jsonify(result)

@bikes_bp.route("/list", methods=["GET"])
@auth_required
def list_visiable_bikes():
    user_id = session.get("user_id")
    result = bike_service.get_visiable_bike_models(user_id)
    return jsonify(result)

@bikes_bp.route("/user_bikes", methods=["GET"])
@auth_required
def list_user_bikes():
    user_id = session.get("user_id")
    result = bike_service.get_user_bike_models(user_id)
    return jsonify(result)

@bikes_bp.route("/sizes", methods=["POST"])
def get_bike_sizes():
    model = request.json.get("bike_model")
    result = bike_service.get_bike_sizes(model)
    return jsonify(result)

@bikes_bp.route("/id", methods=["POST"])
def get_bike_size_id():
    model = request.json.get("bike_model")
    size = request.json.get("size")
    result = bike_service.get_bike_size_id(model, size)
    return jsonify(result)

@bikes_bp.route("/geometry", methods=["POST"])
def get_bike_geometry():
    bike_id = request.json.get("bike_id")
    result = bike_service.get_bike_geometry(bike_id)
    return jsonify(result)

@bikes_bp.route("/pending", methods=["GET"])
@role_required("moderator")
def get_pending_bikes():
    data = bike_service.get_pending_bikes()
    return jsonify(data)

@bikes_bp.route("/set_visibility", methods=["POST"])
@role_required("moderator")
def set_bike_visibility():
    bike_id = request.json.get("bike_id")
    is_public = request.json.get("is_public")
    result = bike_service.set_bike_visibility(bike_id, is_public)
    return jsonify(result)

@bikes_bp.route("/set_pending", methods=["POST"])
@auth_required
def set_bike_pending():
    user_id = session.get("user_id")
    bike_id = request.json.get("bike_id")
    result = bike_service.set_bike_pending(bike_id, user_id)
    return jsonify(result)

@bikes_bp.route("/delete", methods=["POST"])
@auth_required
def delete_bike():
    user_id = session.get("user_id")
    bike_id = request.json.get("bike_id")
    result = bike_service.delete_user_bike(user_id, bike_id)
    return jsonify(result)
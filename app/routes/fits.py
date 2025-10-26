from flask import Blueprint, request, jsonify, session
from app.services import fit_service

fits_bp = Blueprint("fits", __name__, url_prefix="/fits")

@fits_bp.route("/save", methods=["POST"])
def save_fit():
    user_id = session.get("user_id")
    data = request.json
    result = fit_service.save_fit_settings(user_id, data)
    return jsonify(result)

@fits_bp.route("/get", methods=["POST"])
def get_fit():
    fit_name = request.json.get("fit_name")
    bike_id = request.json.get("bike_id")
    result = fit_service.get_fit_by_name(fit_name, bike_id)
    return jsonify(result)

@fits_bp.route("/list", methods=["POST"])
def list_user_fits():
    user_id = session.get("user_id")
    bike_id = request.json.get("bike_id")
    result = fit_service.get_user_fits(user_id, bike_id)
    return jsonify(result)

@fits_bp.route("/basic", methods=["POST"])
def get_basic_fit():
    user_id = session.get("user_id")
    bike_id = request.json.get("bike_id")
    result = fit_service.get_basic_fit(bike_id, user_id)
    return jsonify(result)

@fits_bp.route("/names", methods=["POST"])
def get_fit_names():
    user_id = session.get("user_id")
    bike_id = request.json.get("bike_id")
    result = fit_service.get_user_fits(user_id, bike_id)
    return jsonify(result)

@fits_bp.route("/add_anthropometry", methods=["POST"])
def add_user_anthropometry():
    user_id = session.get("user_id")
    data = request.json
    result = fit_service.add_user_anthropometry(user_id, data)
    return jsonify(result)

@fits_bp.route("/anthropometry", methods=["GET"])
def get_latest_user_anthropometry():
    user_id = session.get("user_id")
    result = fit_service.get_latest_user_anthropometry(user_id)
    return jsonify(result)

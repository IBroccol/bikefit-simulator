from flask import Blueprint, request, jsonify, session
from app.services import fit_service
from app.utils.decorators import auth_required
from app.utils.error_handler import handle_errors, validate_request_data, ValidationError

fits_bp = Blueprint("fits", __name__, url_prefix="/fits")

@fits_bp.route("/save", methods=["POST"])
@auth_required
@handle_errors
def save_fit():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data)
    
    result = fit_service.save_fit_settings(user_id, data)
    
    if result.get("success"):
        return jsonify(result), 201
    
    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify(result), 400

@fits_bp.route("/get", methods=["POST"])
@handle_errors
def get_fit():
    data = request.json
    validate_request_data(data)
    
    result = fit_service.get_fit_by_name(data.get("fit_name"), data.get("size_id"))

    if result.get("success"):
        return jsonify(result), 200
    
    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify({"success": False, "error": "Посадка не найдена"}), 404

@fits_bp.route("/list", methods=["POST"])
@auth_required
@handle_errors
def list_user_fits():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data)
    
    result = fit_service.get_user_fits(user_id, data.get("size_id"))
    
    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify({"success": True, "data": result}), 200

@fits_bp.route("/basic", methods=["POST"])
@auth_required
@handle_errors
def get_basic_fit():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data)

    result = fit_service.get_basic_fit(data.get("size_id"), user_id)

    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify({"success": True, "data": result}), 200

@fits_bp.route("/add_anthropometry", methods=["POST"])
@auth_required
@handle_errors
def add_user_anthropometry():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data)
    
    result = fit_service.add_user_anthropometry(user_id, data)
    
    if result.get("success"):
        return jsonify(result), 201
    
    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify(result), 400

@fits_bp.route("/get_anthropometry", methods=["GET"])
@auth_required
@handle_errors
def get_latest_user_anthropometry():
    user_id = session.get("user_id")
    
    result = fit_service.get_latest_user_anthropometry(user_id)
    
    if result:
        return jsonify({"success": True, "data": result}), 200
    
    return jsonify({"success": False, "error": "Антропометрические данные не найдены"}), 404

@fits_bp.route("/delete", methods=["POST"])
@auth_required
@handle_errors
def delete_fit():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data)
    
    result = fit_service.delete_fit(user_id, data.get("fit_name"), data.get("size_id"))
    
    if result.get("success"):
        return jsonify(result), 200
    
    if "errors" in result:
        raise ValidationError(result["errors"])
    
    return jsonify(result), 400
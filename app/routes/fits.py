from flask import Blueprint, request, jsonify, session
from app.services import fit_service
from app.utils.decorators import *

fits_bp = Blueprint("fits", __name__, url_prefix="/fits")

@fits_bp.route("/save", methods=["POST"])
@auth_required
def save_fit():
    try:
        user_id = session.get("user_id")
            
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Отсутствуют данные запроса"}), 400
            
        result = fit_service.save_fit_settings(user_id, data)
        
        if result.get("success"):
            return jsonify(result), 201
        else:
            if "errors" in result:
                return jsonify({"success": False, "errors": result["errors"]}), 400
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500

@fits_bp.route("/get", methods=["POST"])
def get_fit():
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Отсутствуют данные запроса"}), 400
            
        result = fit_service.get_fit_by_name(data.get("fit_name"), data.get("size_id"))

        if result.get("success"):
            return jsonify(result), 200
        else:
            if "errors" in result:
                return jsonify({"success": False, "errors": result["errors"]}), 400
            return jsonify({"success": False, "error": "Посадка не найдена"}), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500

@fits_bp.route("/list", methods=["POST"])
@auth_required
def list_user_fits():
    try:
        user_id = session.get("user_id")
            
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Отсутствуют данные запроса"}), 400
            
        result = fit_service.get_user_fits(user_id, data.get("size_id"))
        
        if "errors" in result:
            return jsonify({"success": False, "errors": result["errors"]}), 400
        
        return jsonify({"success": True, "data": result}), 200
            
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500

@fits_bp.route("/basic", methods=["POST"])
@auth_required
def get_basic_fit():
    try:
        user_id = session.get("user_id")
        
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Отсутствуют данные запроса"}), 400
        
        print(user_id, data)

        result = fit_service.get_basic_fit(data.get("size_id"), user_id)


        if "errors" in result:
            return jsonify({"success": False, "errors": result["errors"]}), 400
        
        return jsonify({"success": True, "data": result}), 200
            
    except Exception as e:
        print(e)
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500

@fits_bp.route("/add_anthropometry", methods=["POST"])
@auth_required
def add_user_anthropometry():
    try:
        user_id = session.get("user_id")
            
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Отсутствуют данные запроса"}), 400
            
        result = fit_service.add_user_anthropometry(user_id, data)
        
        if result.get("success"):
            return jsonify(result), 201
        else:
            if "errors" in result:
                return jsonify({"success": False, "errors": result["errors"]}), 400
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500

@fits_bp.route("/get_anthropometry", methods=["GET"])
@auth_required
def get_latest_user_anthropometry():
    try:
        user_id = session.get("user_id")
            
        result = fit_service.get_latest_user_anthropometry(user_id)
        
        if result:
            return jsonify({"success": True, "data": result}), 200
        else:
            return jsonify({"success": False, "error": "Антропометрические данные не найдены"}), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": "Внутренняя ошибка сервера"}), 500
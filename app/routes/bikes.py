from flask import Blueprint, request, jsonify, session
from app.services import bike_service
from app.utils.decorators import role_required, auth_required
from app.utils.error_handler import handle_errors, validate_request_data
from app.utils.bikeinsights_parser import parse_bikeinsights_html
import urllib.request
import urllib.error

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
@handle_errors
def list_visiable_bikes():
    # No auth required: unauthenticated users get only public bikes;
    # authenticated users also see their own private/pending bikes.
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


@bikes_bp.route("/parse_url", methods=["POST"])
@auth_required
@handle_errors
def parse_bike_url():
    """
    Fetch a bikeinsights.com bike page and extract geometry data.
    Request body: { "url": "https://bikeinsights.com/bikes/..." }
    Response: { "model": "...", "sizes": [ { "label": "44", "stack": 501, ... }, ... ] }
    """
    data = request.json
    validate_request_data(data, ["url"])

    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "URL не указан"}), 400

    # Only allow bikeinsights.com URLs
    if "bikeinsights.com" not in url:
        return jsonify({"error": "Поддерживаются только ссылки с bikeinsights.com"}), 400

    # Fetch the page
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; Bikefit/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return jsonify({"error": f"Страница недоступна (HTTP {e.code})"}), 502
    except urllib.error.URLError as e:
        return jsonify({"error": f"Не удалось загрузить страницу: {e.reason}"}), 502
    except Exception as e:
        return jsonify({"error": f"Ошибка при загрузке страницы: {str(e)}"}), 502

    # Parse geometry
    try:
        result = parse_bikeinsights_html(html)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

    return jsonify(result)
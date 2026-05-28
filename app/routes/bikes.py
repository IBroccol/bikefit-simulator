from flask import Blueprint, request, jsonify, session
from app.services import bike_service
from app.models import dao
from app.utils.decorators import role_required, auth_required
from app.utils.error_handler import handle_errors, validate_request_data
from app.utils.bikeinsights_parser import parse_bikeinsights_html
import urllib.request
import urllib.error
import urllib.parse

bikes_bp = Blueprint("bikes", __name__, url_prefix="/bikes")


@bikes_bp.route("/add", methods=["POST"])
@auth_required
@handle_errors
def add_bike():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data)
    return jsonify(bike_service.add_user_bike(user_id, data))


@bikes_bp.route("/list", methods=["GET"])
@handle_errors
def list_visible_bikes():
    user_id = session.get("user_id")
    return jsonify(bike_service.get_visible_bike_models(user_id))


@bikes_bp.route("/user_bikes", methods=["GET"])
@auth_required
@handle_errors
def list_user_bikes():
    user_id = session.get("user_id")
    return jsonify(bike_service.get_user_bike_models(user_id))


@bikes_bp.route("/sizes", methods=["POST"])
@auth_required
@handle_errors
def get_bike_sizes():
    user_id = session.get("user_id")
    role = session.get("user_role")
    data = request.json
    validate_request_data(data, ["bike_model_id"])

    bike_model_id = data.get("bike_model_id")
    # Moderators can view sizes of any bike (including pending ones)
    if role != "moderator":
        accessible = any(bm["id"] == bike_model_id for bm in dao.get_visible_bike_models(user_id))
        if not accessible:
            return jsonify({"success": False, "error": "Модель велосипеда не найдена или недоступна"}), 404

    return jsonify(bike_service.get_bike_sizes(bike_model_id))


@bikes_bp.route("/id", methods=["POST"])
@handle_errors
def get_bike_size_id():
    data = request.json
    validate_request_data(data, ["bike_model", "size"])
    return jsonify(bike_service.get_bike_size_id(data.get("bike_model"), data.get("size")))


@bikes_bp.route("/geometry", methods=["POST"])
@auth_required
@handle_errors
def get_bike_geometry():
    user_id = session.get("user_id")
    role = session.get("user_role")
    data = request.json
    validate_request_data(data, ["size_id"])

    size_id = data.get("size_id")
    size_row = dao.get_bike_geometry(size_id)
    if size_row is None:
        return jsonify({"success": False, "error": "Размер велосипеда не найден"}), 404

    # Moderators can view geometry of any bike (including pending ones)
    if role != "moderator":
        accessible = any(bm["id"] == size_row.get("bike_model_id") for bm in dao.get_visible_bike_models(user_id))
        if not accessible:
            return jsonify({"success": False, "error": "Доступ к данному велосипеду запрещён"}), 403

    return jsonify(bike_service.get_bike_geometry(size_id))


@bikes_bp.route("/pending", methods=["GET"])
@role_required("moderator")
@handle_errors
def get_pending_bikes():
    return jsonify(bike_service.get_pending_bikes())


@bikes_bp.route("/set_visibility", methods=["PATCH"])
@role_required("moderator")
@handle_errors
def set_bike_visibility():
    data = request.json
    validate_request_data(data, ["bike_id", "is_public"])
    return jsonify(bike_service.set_bike_visibility(data.get("bike_id"), data.get("is_public")))


@bikes_bp.route("/set_pending", methods=["POST"])
@auth_required
@handle_errors
def set_bike_pending():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data, ["bike_id"])
    return jsonify(bike_service.set_bike_pending(data.get("bike_id"), user_id))


@bikes_bp.route("/delete", methods=["DELETE"])
@auth_required
@handle_errors
def delete_bike():
    user_id = session.get("user_id")
    data = request.json
    validate_request_data(data, ["bike_id"])
    return jsonify(bike_service.delete_user_bike(user_id, data.get("bike_id")))


@bikes_bp.route("/parse_url", methods=["POST"])
@auth_required
@handle_errors
def parse_bike_url():
    data = request.json
    validate_request_data(data, ["url"])

    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "URL не указан"}), 400

    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return jsonify({"error": "Некорректный URL"}), 400

    hostname = parsed.hostname or ""
    if hostname != "bikeinsights.com" and not hostname.endswith(".bikeinsights.com"):
        return jsonify({"error": "Поддерживаются только ссылки с bikeinsights.com"}), 400

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Bikefit/1.0)"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return jsonify({"error": f"Страница недоступна (HTTP {e.code})"}), 502
    except urllib.error.URLError as e:
        return jsonify({"error": f"Не удалось загрузить страницу: {e.reason}"}), 502
    except Exception as e:
        return jsonify({"error": f"Ошибка при загрузке страницы: {str(e)}"}), 502

    try:
        return jsonify(parse_bikeinsights_html(html))
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

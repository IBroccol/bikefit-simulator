from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

_mock_db = {
    "users": [],
    "bike_models": [],
    "bike_sizes": [],
    "anthropometry": [],
    "fit_settings": [],
}

_counters = {
    "users": 1,
    "bike_models": 1,
    "bike_sizes": 1,
    "anthropometry": 1,
    "fit_settings": 1,
}


def _next_id(table):
    _id = _counters[table]
    _counters[table] += 1
    return _id


# --- Пользователи ---

def create_user_account(username, password):
    try:
        if any(u["username"] == username for u in _mock_db["users"]):
            return {"success": False, "errors": [{"field": "username", "message": "Пользователь с таким именем уже существует"}]}
        _mock_db["users"].append({
            "id": _next_id("users"),
            "username": username,
            "password_hash": generate_password_hash(password, method='pbkdf2:sha256'),
            "role": "user",
            "created_at": datetime.now(),
        })
        return {"success": True}
    except Exception as e:
        logger.error(f"create_user_account: {e}", exc_info=True)
        return {"success": False, "errors": [{"field": "general", "message": "Не удалось создать учетную запись"}]}


def authenticate_user(username, password):
    user = get_user_by_username(username)
    if user and check_password_hash(user["password_hash"], password):
        return {"id": user["id"], "role": user["role"], "username": user["username"]}
    return None


def get_user_by_username(username):
    return next((u for u in _mock_db["users"] if u["username"] == username), None)


def get_user_by_id(user_id):
    user = next((u for u in _mock_db["users"] if u["id"] == user_id), None)
    if user:
        return {"id": user["id"], "username": user["username"], "role": user["role"]}
    return None


# --- Велосипеды ---

def add_user_bike(user_id: int, bike: dict) -> dict:
    try:
        model_name = bike.get("model")
        size = bike.get("size")

        if not model_name or not size:
            return {"success": False, "errors": [{"field": "data", "message": "Необходимо указать модель и размер велосипеда"}]}

        bike_model = next(
            (bm for bm in _mock_db["bike_models"] if bm["user_id"] == user_id and bm["model"] == model_name),
            None,
        )
        if not bike_model:
            bike_model = {
                "id": _next_id("bike_models"),
                "user_id": user_id,
                "model": model_name,
                "status": "private",
                "is_moderated": False,
                "created_at": datetime.now(),
            }
            _mock_db["bike_models"].append(bike_model)

        bike_model_id = bike_model["id"]
        fields = {k: v for k, v in bike.items() if k != "model"}
        fields["bike_model_id"] = bike_model_id

        existing = next(
            (bs for bs in _mock_db["bike_sizes"] if bs["bike_model_id"] == bike_model_id and bs["size"] == size),
            None,
        )
        if existing:
            for k, v in fields.items():
                if k not in ("bike_model_id", "size"):
                    existing[k] = v
        else:
            _mock_db["bike_sizes"].append({"id": _next_id("bike_sizes"), **fields, "created_at": datetime.now()})

        return {"success": True, "bike_model_id": bike_model_id}

    except Exception as e:
        logger.error(f"add_user_bike: {e}", exc_info=True)
        return {"success": False, "errors": [{"field": "general", "message": "Не удалось добавить велосипед"}]}


def get_bike_geometry(size_id):
    return next((bs for bs in _mock_db["bike_sizes"] if bs["id"] == size_id), None)


def get_visible_bike_models(user_id):
    return [bm for bm in _mock_db["bike_models"] if bm["status"] == "public" or bm["user_id"] == user_id]


def get_user_bike_models(user_id):
    return [bm for bm in _mock_db["bike_models"] if bm["user_id"] == user_id]


def get_pending_bikes():
    return [bm for bm in _mock_db["bike_models"] if bm["status"] == "pending"]


def set_bike_visibility(bike_id, is_public):
    bike_model = next((bm for bm in _mock_db["bike_models"] if bm["id"] == bike_id), None)
    if not bike_model:
        return {"success": False, "error": "Велосипед не найден"}
    bike_model["status"] = "public" if is_public else "private"
    bike_model["is_moderated"] = True
    return {"success": True}


def get_bike_sizes(bike_model_id):
    matching = sorted(
        (bs for bs in _mock_db["bike_sizes"] if bs["bike_model_id"] == bike_model_id),
        key=lambda bs: bs.get("seatTube") or 0,
    )
    return [{"size": bs["size"], "id": bs["id"]} for bs in matching]


def get_bike_size_id(bike_model, size):
    model = next((bm for bm in _mock_db["bike_models"] if bm["model"] == bike_model), None)
    if not model:
        return None
    bs = next(
        (bs for bs in _mock_db["bike_sizes"] if bs["bike_model_id"] == model["id"] and bs["size"] == size),
        None,
    )
    return bs["id"] if bs else None


def delete_user_bike(user_id, bike_id):
    try:
        before = len(_mock_db["bike_models"])
        _mock_db["bike_models"] = [
            bm for bm in _mock_db["bike_models"]
            if not (bm["id"] == bike_id and bm["user_id"] == user_id)
        ]
        if len(_mock_db["bike_models"]) == before:
            return {"success": False, "error": "Велосипед не найден или не принадлежит пользователю"}
        return {"success": True}
    except Exception as e:
        logger.error(f"delete_user_bike: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось удалить велосипед"}


def set_bike_pending(bike_id, user_id):
    bike_model = next(
        (bm for bm in _mock_db["bike_models"] if bm["id"] == bike_id and bm["user_id"] == user_id),
        None,
    )
    if not bike_model:
        return {"success": False, "error": "Велосипед не найден"}
    bike_model["status"] = "pending"
    return {"success": True}


# --- Антропометрия ---

def add_user_anthropometry(user_id, data):
    try:
        _mock_db["anthropometry"].append({
            "id": _next_id("anthropometry"),
            "user_id": user_id,
            **data,
            "created_at": datetime.now(),
        })
        return {"success": True}
    except Exception as e:
        logger.error(f"add_user_anthropometry: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось сохранить антропометрические данные"}


def get_latest_user_anthropometry(user_id):
    records = [a for a in _mock_db["anthropometry"] if a["user_id"] == user_id]
    if not records:
        return None
    latest = max(records, key=lambda a: a["created_at"])
    return {k: v for k, v in latest.items() if k not in ("id", "user_id", "created_at")}


# --- Посадка ---

def save_fit_settings(user_id, data):
    try:
        _mock_db["fit_settings"].append({
            "id": _next_id("fit_settings"),
            "user_id": user_id,
            "bike_id": data["size_id"],
            "name": data["name"],
            "seatHight": data["seatHight"],
            "stemHight": data["stemHight"],
            "saddleOffset": data["saddleOffset"],
            "torsoAngle": data["torsoAngle"],
            "shifterAngle": data["shifterAngle"],
            "created_at": datetime.now(),
        })
        return {"success": True}
    except Exception as e:
        logger.error(f"save_fit_settings: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось сохранить настройки посадки"}


def get_fit_by_name(fit_name, size_id):
    return next(
        (fs for fs in _mock_db["fit_settings"] if fs["name"] == fit_name and fs["bike_id"] == size_id),
        None,
    )


def get_user_fits(user_id, size_id):
    return [fs["name"] for fs in _mock_db["fit_settings"] if fs["user_id"] == user_id and fs["bike_id"] == size_id]


def delete_fit(user_id, fit_name, size_id):
    try:
        _mock_db["fit_settings"] = [
            fs for fs in _mock_db["fit_settings"]
            if not (fs["user_id"] == user_id and fs["name"] == fit_name and fs["bike_id"] == size_id)
        ]
        return {"success": True}
    except Exception as e:
        logger.error(f"delete_fit: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось удалить посадку"}

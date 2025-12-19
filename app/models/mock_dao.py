from werkzeug.security import generate_password_hash, check_password_hash
import logging
from datetime import datetime

# Настройка логирования
logger = logging.getLogger(__name__)

# In-memory mock database storage
_mock_db = {
    "users": [],
    "bike_models": [],
    "bike_sizes": [],
    "anthropometry": [],
    "fit_settings": []
}

# Auto-increment counters
_counters = {
    "users": 1,
    "bike_models": 1,
    "bike_sizes": 1,
    "anthropometry": 1,
    "fit_settings": 1
}

def _get_next_id(table):
    """Get next auto-increment ID for a table"""
    current = _counters[table]
    _counters[table] += 1
    return current

# --- Пользователи ---
def create_user_account(username, password):
    try:
        # Check if user exists
        existing_user = next((u for u in _mock_db["users"] if u["username"] == username), None)
        if existing_user:
            return {"success": False, "errors": [{"field": "username", "message": "Пользователь с таким именем уже существует"}]}
        
        # Create new user (using pbkdf2:sha256 for compatibility with Python 3.9)
        password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        user = {
            "id": _get_next_id("users"),
            "username": username,
            "password_hash": password_hash,
            "role": "user",
            "created_at": datetime.now()
        }
        _mock_db["users"].append(user)
        return {"success": True}
    except Exception as e:
        logger.error(f"Ошибка при создании пользователя: {str(e)}", exc_info=True)
        return {"success": False, "errors": [{"field": "general", "message": "Не удалось создать учетную запись"}]}

def authenticate_user(username, password):
    user = get_user_by_username(username)
    if user and check_password_hash(user["password_hash"], password):
        return {"id": user["id"], "role": user["role"]}
    return None

def get_user_by_username(username):
    return next((u for u in _mock_db["users"] if u["username"] == username), None)

# --- Велосипеды ---
def add_user_bike(user_id: int, bike: dict) -> dict:
    """Добавляет велосипед пользователя в базу данных, создавая модель и размер при необходимости."""

    try:
        model_name = bike.get("model")
        size = bike.get("size")

        if not model_name or not size:
            return {"success": False, "errors": [{"field": "data", "message": "Необходимо указать модель и размер велосипеда"}]}

        # Find or create bike model
        bike_model = next(
            (bm for bm in _mock_db["bike_models"] 
             if bm["user_id"] == user_id and bm["model"] == model_name),
            None
        )
        
        if not bike_model:
            bike_model = {
                "id": _get_next_id("bike_models"),
                "user_id": user_id,
                "model": model_name,
                "status": "private",
                "is_moderated": False,
                "created_at": datetime.now()
            }
            _mock_db["bike_models"].append(bike_model)
        
        bike_model_id = bike_model["id"]

        # Prepare geometry fields
        geometry_fields = {k: v for k, v in bike.items() if k != "model"}
        geometry_fields["bike_model_id"] = bike_model_id

        # Find existing bike size
        existing_size = next(
            (bs for bs in _mock_db["bike_sizes"]
             if bs["bike_model_id"] == bike_model_id and bs["size"] == size),
            None
        )

        if existing_size:
            # Update existing size
            for key, value in geometry_fields.items():
                if key not in ("bike_model_id", "size"):
                    existing_size[key] = value
        else:
            # Create new size
            new_size = {
                "id": _get_next_id("bike_sizes"),
                **geometry_fields,
                "created_at": datetime.now()
            }
            _mock_db["bike_sizes"].append(new_size)

        return {"success": True, "bike_model_id": bike_model_id}

    except Exception as e:
        logger.error(f"Ошибка при добавлении велосипеда: {str(e)}", exc_info=True)
        return {"success": False, "errors": [{"field": "general", "message": "Не удалось добавить велосипед"}]}

def get_bike_geometry(size_id):
    try:
        return next((bs for bs in _mock_db["bike_sizes"] if bs["id"] == size_id), None)
    except Exception as e:
        logger.error(f"Ошибка при получении геометрии велосипеда: {str(e)}", exc_info=True)
        return None

def get_visiable_bike_models(user_id):
    try:
        return [
            bm for bm in _mock_db["bike_models"]
            if bm["status"] == "public" or bm["user_id"] == user_id
        ]
    except Exception as e:
        logger.error(f"Ошибка при получении списка велосипедов: {str(e)}", exc_info=True)
        return []

def get_user_bike_models(user_id):
    try:
        return [bm for bm in _mock_db["bike_models"] if bm["user_id"] == user_id]
    except Exception as e:
        logger.error(f"Ошибка при получении велосипедов пользователя: {str(e)}", exc_info=True)
        return []

def get_pending_bikes():
    try:
        return [bm for bm in _mock_db["bike_models"] if bm["status"] == "pending"]
    except Exception as e:
        logger.error(f"Ошибка при получении велосипедов на модерации: {str(e)}", exc_info=True)
        return []

def set_bike_visibility(bike_id, is_public):
    try:
        bike_model = next((bm for bm in _mock_db["bike_models"] if bm["id"] == bike_id), None)
        if bike_model:
            bike_model["status"] = "public" if is_public else "private"
            bike_model["is_moderated"] = True
            return {"success": True}
        return {"success": False, "error": "Велосипед не найден"}
    except Exception as e:
        logger.error(f"Ошибка при изменении видимости велосипеда: {str(e)}", exc_info=True)
        return {"success": False, "error": "Не удалось изменить видимость велосипеда"}

def get_bike_sizes(bike_model_id):
    try:
        sizes = [
            {"size": bs["size"], "id": bs["id"]}
            for bs in _mock_db["bike_sizes"]
            if bs["bike_model_id"] == bike_model_id
        ]
        # Sort by seatTube if available
        sizes.sort(key=lambda x: _mock_db["bike_sizes"][
            next(i for i, bs in enumerate(_mock_db["bike_sizes"]) if bs["id"] == x["id"])
        ].get("seatTube", 0))
        return sizes
    except Exception as e:
        logger.error(f"Ошибка при получении размеров велосипеда: {str(e)}", exc_info=True)
        return []

def get_bike_size_id(bike_model, size):
    try:
        # Find bike model
        bike_model_obj = next(
            (bm for bm in _mock_db["bike_models"] if bm["model"] == bike_model),
            None
        )
        if not bike_model_obj:
            return None
        
        # Find bike size
        bike_size = next(
            (bs for bs in _mock_db["bike_sizes"]
             if bs["bike_model_id"] == bike_model_obj["id"] and bs["size"] == size),
            None
        )
        return bike_size["id"] if bike_size else None
    except Exception as e:
        logger.error(f"Ошибка при получении ID размера велосипеда: {str(e)}", exc_info=True)
        return None

# --- Антропометрия ---
def add_user_anthropometry(user_id, data):
    try:
        anthropometry = {
            "id": _get_next_id("anthropometry"),
            "user_id": user_id,
            **data,
            "created_at": datetime.now()
        }
        _mock_db["anthropometry"].append(anthropometry)
        return {"success": True}
    except Exception as e:
        logger.error(f"Ошибка при добавлении антропометрии: {str(e)}", exc_info=True)
        return {"success": False, "error": "Не удалось сохранить антропометрические данные"}

def get_latest_user_anthropometry(user_id):
    try:
        user_anthropometry = [
            a for a in _mock_db["anthropometry"]
            if a["user_id"] == user_id
        ]
        if not user_anthropometry:
            return None
        
        # Get latest by created_at
        latest = max(user_anthropometry, key=lambda x: x["created_at"])
        
        # Return copy without id, user_id, created_at
        result = {k: v for k, v in latest.items() if k not in ("id", "user_id", "created_at")}
        return result
    except Exception as e:
        logger.error(f"Ошибка при получении антропометрии: {str(e)}", exc_info=True)
        return None

# --- Посадка ---
def save_fit_settings(user_id, data):
    try:
        fit_setting = {
            "id": _get_next_id("fit_settings"),
            "user_id": user_id,
            "bike_id": data["size_id"],
            "name": data["name"],
            "seatHight": data["seatHight"],
            "stemHight": data["stemHight"],
            "saddleOffset": data["saddleOffset"],
            "torsoAngle": data["torsoAngle"],
            "shifterAngle": data["shifterAngle"],
            "created_at": datetime.now()
        }
        _mock_db["fit_settings"].append(fit_setting)
        return {"success": True}
    except Exception as e:
        logger.error(f"Ошибка при сохранении настроек посадки: {str(e)}", exc_info=True)
        return {"success": False, "error": "Не удалось сохранить настройки посадки"}

def get_fit_by_name(fit_name, size_id):
    try:
        return next(
            (fs for fs in _mock_db["fit_settings"]
             if fs["name"] == fit_name and fs["bike_id"] == size_id),
            None
        )
    except Exception as e:
        logger.error(f"Ошибка при получении посадки: {str(e)}", exc_info=True)
        return None

def get_user_fits(user_id, size_id):
    try:
        return [
            fs["name"] for fs in _mock_db["fit_settings"]
            if fs["user_id"] == user_id and fs["bike_id"] == size_id
        ]
    except Exception as e:
        logger.error(f"Ошибка при получении списка посадок: {str(e)}", exc_info=True)
        return []

def delete_fit(user_id, fit_name, size_id):
    try:
        _mock_db["fit_settings"] = [
            fs for fs in _mock_db["fit_settings"]
            if not (fs["user_id"] == user_id and fs["name"] == fit_name and fs["bike_id"] == size_id)
        ]
        return {"success": True}
    except Exception as e:
        logger.error(f"Ошибка при удалении посадки: {str(e)}", exc_info=True)
        return {"success": False, "error": "Не удалось удалить посадку"}
        
def delete_user_bike(user_id, bike_id):
    try:
        _mock_db["bike_models"] = [
            bm for bm in _mock_db["bike_models"]
            if not (bm["id"] == bike_id and bm["user_id"] == user_id)
        ]
        return {"success": True}
    except Exception as e:
        logger.error(f"Ошибка при удалении велосипеда: {str(e)}", exc_info=True)
        return {"success": False, "error": "Не удалось удалить велосипед"}
        
def set_bike_pending(bike_id, user_id):
    try:
        bike_model = next(
            (bm for bm in _mock_db["bike_models"]
             if bm["id"] == bike_id and bm["user_id"] == user_id),
            None
        )
        if bike_model:
            bike_model["status"] = "pending"
            return {"success": True}
        return {"success": False, "error": "Велосипед не найден"}
    except Exception as e:
        logger.error(f"Ошибка при отправке велосипеда на модерацию: {str(e)}", exc_info=True)
        return {"success": False, "error": "Не удалось отправить велосипед на модерацию"}

from psycopg.rows import dict_row
from .db import get_conn
from werkzeug.security import generate_password_hash, check_password_hash
import logging

logger = logging.getLogger(__name__)

# Допустимые колонки таблицы bike_sizes (защита от SQL-инъекции через имена полей)
_BIKE_SIZE_COLUMNS = frozenset({
    "bike_model_id", "size",
    "seatTube", "seatAngle", "headTube", "headAngle", "bbdrop",
    "chainstay", "wheelbase", "stack", "reach",
    "rimD", "tyreW", "crankLen",
    "stemLen", "stemAngle", "minStemHight", "maxStemHight",
    "barReach", "barDrop", "shifterReach",
    "saddleLen", "saddleRailLen", "saddleHeight",
    "minseatpostLen", "maxseatpostLen",
})


# --- Пользователи ---

def create_user_account(username, password):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE username=%s", (username,))
                if cur.fetchone():
                    return {"success": False, "errors": [{"field": "username", "message": "Пользователь с таким именем уже существует"}]}
                password_hash = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
                cur.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, password_hash))
                conn.commit()
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
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM users WHERE username=%s", (username,))
            return cur.fetchone()


def get_user_by_id(user_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, username, role FROM users WHERE id=%s", (user_id,))
            return cur.fetchone()


# --- Велосипеды ---

def add_user_bike(user_id: int, bike: dict) -> dict:
    try:
        with get_conn() as conn, conn.cursor() as cur:
            model_name = bike.get("model")
            size = bike.get("size")

            if not model_name or not size:
                return {"success": False, "errors": [{"field": "data", "message": "Необходимо указать модель и размер велосипеда"}]}

            cur.execute(
                """
                INSERT INTO bike_models (user_id, model)
                VALUES (%s, %s)
                ON CONFLICT (user_id, model) DO NOTHING
                RETURNING id
                """,
                (user_id, model_name),
            )
            model_row = cur.fetchone()

            if model_row:
                bike_model_id = model_row[0]
            else:
                cur.execute(
                    "SELECT id FROM bike_models WHERE user_id = %s AND model = %s",
                    (user_id, model_name),
                )
                bike_model_id = cur.fetchone()[0]

            fields = {k: v for k, v in bike.items() if k != "model" and k in _BIKE_SIZE_COLUMNS}
            fields["bike_model_id"] = bike_model_id

            col_names = ", ".join(f'"{c}"' for c in fields)
            placeholders = ", ".join(["%s"] * len(fields))
            update_clause = ", ".join(
                f'"{c}" = EXCLUDED."{c}"'
                for c in fields
                if c not in ("bike_model_id", "size")
            )

            cur.execute(
                f"""
                INSERT INTO bike_sizes ({col_names})
                VALUES ({placeholders})
                ON CONFLICT (bike_model_id, size) DO UPDATE
                SET {update_clause}
                """,
                tuple(fields.values()),
            )
            conn.commit()
            return {"success": True, "bike_model_id": bike_model_id}

    except Exception as e:
        logger.error(f"add_user_bike: {e}", exc_info=True)
        return {"success": False, "errors": [{"field": "general", "message": "Не удалось добавить велосипед"}]}


def get_bike_geometry(size_id):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute("SELECT * FROM bike_sizes WHERE id=%s", (size_id,))
                return cur.fetchone()
    except Exception as e:
        logger.error(f"get_bike_geometry: {e}", exc_info=True)
        return None


def get_visible_bike_models(user_id):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    "SELECT * FROM bike_models WHERE status = 'public' OR user_id=%s ORDER BY model",
                    (user_id,),
                )
                return cur.fetchall()
    except Exception as e:
        logger.error(f"get_visible_bike_models: {e}", exc_info=True)
        return []


def get_user_bike_models(user_id):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute("SELECT * FROM bike_models WHERE user_id=%s ORDER BY model", (user_id,))
                return cur.fetchall()
    except Exception as e:
        logger.error(f"get_user_bike_models: {e}", exc_info=True)
        return []


def get_pending_bikes():
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute("SELECT * FROM bike_models WHERE status = 'pending' ORDER BY created_at")
                return cur.fetchall()
    except Exception as e:
        logger.error(f"get_pending_bikes: {e}", exc_info=True)
        return []


def set_bike_visibility(bike_id, is_public):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                status = 'public' if is_public else 'private'
                cur.execute(
                    "UPDATE bike_models SET status = %s, is_moderated = TRUE WHERE id = %s",
                    (status, bike_id),
                )
                conn.commit()
                return {"success": True}
    except Exception as e:
        logger.error(f"set_bike_visibility: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось изменить видимость велосипеда"}


def get_bike_sizes(bike_model_id):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    'SELECT size, id FROM bike_sizes WHERE bike_model_id = %s ORDER BY "seatTube"',
                    (bike_model_id,),
                )
                return cur.fetchall()
    except Exception as e:
        logger.error(f"get_bike_sizes: {e}", exc_info=True)
        return []


def get_bike_size_id(bike_model, size):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    SELECT bs.id FROM bike_sizes bs
                    JOIN bike_models bm ON bs.bike_model_id = bm.id
                    WHERE bm.model=%s AND bs.size=%s
                    """,
                    (bike_model, size),
                )
                row = cur.fetchone()
                return row["id"] if row else None
    except Exception as e:
        logger.error(f"get_bike_size_id: {e}", exc_info=True)
        return None


def delete_user_bike(user_id, bike_id):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM bike_models WHERE id=%s AND user_id=%s",
                    (bike_id, user_id),
                )
                if cur.rowcount == 0:
                    return {"success": False, "error": "Велосипед не найден или не принадлежит пользователю"}
                conn.commit()
                return {"success": True}
    except Exception as e:
        logger.error(f"delete_user_bike: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось удалить велосипед"}


def set_bike_pending(bike_id, user_id):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE bike_models SET status = 'pending' WHERE id=%s AND user_id=%s",
                    (bike_id, user_id),
                )
                conn.commit()
                return {"success": True}
    except Exception as e:
        logger.error(f"set_bike_pending: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось отправить велосипед на модерацию"}


# --- Антропометрия ---

def add_user_anthropometry(user_id, data):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                fields = {"user_id": user_id, **data}
                col_names = ", ".join(f'"{k}"' for k in fields)
                placeholders = ", ".join(["%s"] * len(fields))
                cur.execute(
                    f"INSERT INTO anthropometry ({col_names}) VALUES ({placeholders})",
                    tuple(fields.values()),
                )
                conn.commit()
                return {"success": True}
    except Exception as e:
        logger.error(f"add_user_anthropometry: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось сохранить антропометрические данные"}


def get_latest_user_anthropometry(user_id):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    "SELECT * FROM anthropometry WHERE user_id=%s ORDER BY created_at DESC LIMIT 1",
                    (user_id,),
                )
                result = cur.fetchone()
                if result:
                    result.pop("id", None)
                    result.pop("user_id", None)
                    result.pop("created_at", None)
                return result
    except Exception as e:
        logger.error(f"get_latest_user_anthropometry: {e}", exc_info=True)
        return None


# --- Посадка ---

def save_fit_settings(user_id, data):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO fit_settings
                        (user_id, bike_id, name, "seatHight", "stemHight", "saddleOffset", "torsoAngle", "shifterAngle")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        data["size_id"],
                        data["name"],
                        data["seatHight"],
                        data["stemHight"],
                        data["saddleOffset"],
                        data["torsoAngle"],
                        data["shifterAngle"],
                    ),
                )
                conn.commit()
                return {"success": True}
    except Exception as e:
        logger.error(f"save_fit_settings: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось сохранить настройки посадки"}


def get_fit_by_name(fit_name, size_id):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    "SELECT * FROM fit_settings WHERE name=%s AND bike_id=%s",
                    (fit_name, size_id),
                )
                return cur.fetchone()
    except Exception as e:
        logger.error(f"get_fit_by_name: {e}", exc_info=True)
        return None


def get_user_fits(user_id, size_id):
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    "SELECT name FROM fit_settings WHERE user_id=%s AND bike_id=%s",
                    (user_id, size_id),
                )
                return [row["name"] for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"get_user_fits: {e}", exc_info=True)
        return []


def delete_fit(user_id, fit_name, size_id):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM fit_settings WHERE user_id=%s AND name=%s AND bike_id=%s",
                    (user_id, fit_name, size_id),
                )
                conn.commit()
                return {"success": True}
    except Exception as e:
        logger.error(f"delete_fit: {e}", exc_info=True)
        return {"success": False, "error": "Не удалось удалить посадку"}

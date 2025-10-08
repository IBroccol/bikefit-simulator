import psycopg
from psycopg.rows import dict_row
from .db import get_conn
from werkzeug.security import generate_password_hash, check_password_hash
from flask import jsonify

# --- Пользователи ---
def create_user(username, password):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE username=%s", (username,))
                if cur.fetchone():
                    return {"success": False}
                password_hash = generate_password_hash(password)
                cur.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, password_hash))
                conn.commit()
                return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def verify_user(username, password):
    user = get_user(username)
    if user and check_password_hash(user["password_hash"], password):
        return {"id": user["id"], "role": user["role"]}
    return None

def get_user(username):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM users WHERE username=%s", (username,))
            return cur.fetchone()

# --- Велосипеды ---
def add_bike(user_id: int, bike: dict) -> dict:
    """Добавляет велосипед пользователя в базу данных, создавая модель и размер при необходимости."""

    try:
        with get_conn() as conn, conn.cursor() as cur:
            model_name = bike.get("model")
            size = bike.get("size")

            if not model_name or not size:
                return {"success": False, "error": "Model name and size are required"}

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
                    """
                    SELECT id
                    FROM bike_models
                    WHERE user_id = %s AND model = %s
                    """,
                    (user_id, model_name),
                )
                bike_model_id = cur.fetchone()[0]

            geometry_fields = {
                k: v for k, v in bike.items()
                if k != "model"
            }
            geometry_fields["bike_model_id"] = bike_model_id

            columns = [f'"{col}"' for col in geometry_fields.keys()]
            placeholders = ", ".join(["%s"] * len(columns))
            col_names = ", ".join(columns)

            update_clause = ", ".join(
                f'"{col}" = EXCLUDED."{col}"'
                for col in geometry_fields.keys()
                if col not in ("bike_model_id", "size")
            )

            sql = f"""
                INSERT INTO bike_sizes ({col_names})
                VALUES ({placeholders})
                ON CONFLICT (bike_model_id, size) DO UPDATE
                SET {update_clause}
            """

            cur.execute(sql, tuple(geometry_fields.values()))
            conn.commit()

            return {"success": True, "bike_model_id": bike_model_id}

    except Exception as e:
        return {"success": False, "error": str(e)}


def get_bike_geo(size_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM bike_sizes WHERE id=%s", (size_id,))
            return cur.fetchone()

def get_user_bikes(user_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT model FROM bike_models WHERE is_public OR user_id=%s ORDER BY model", (user_id,))
            return [row["model"] for row in cur.fetchall()]

def get_pending_bikes():
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM bike_models WHERE NOT is_public AND NOT is_moderated ORDER BY created_at")
            return cur.fetchall()

def set_privacy(bike_id, is_public):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("UPDATE bike_models SET is_public = %s, is_moderated = TRUE WHERE id = %s", (is_public, bike_id))
            return {"success": True}   

def get_bike_sizes(bike_model):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute('SELECT size FROM bike_sizes bs JOIN bike_models bm ON bs.bike_model_id = bm.id WHERE bm.model=%s ORDER BY bs."seatTube"', (bike_model,))
            return [row["size"] for row in cur.fetchall()]

def get_bike_id(bike_model, size):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT bs.id FROM bike_sizes bs JOIN bike_models bm ON bs.bike_model_id = bm.id WHERE bm.model=%s AND bs.size=%s", (bike_model, size))
            row = cur.fetchone()
            return row["id"] if row else None

# --- Антропометрия ---
def add_anthropometry(user_id, data):
    with get_conn() as conn:
        with conn.cursor() as cur:
            # добавляем user_id в словарь
            data_with_uid = {"user_id": user_id, **data}

            # список колонок
            columns = [f'"{col_name}"' for col_name in data_with_uid.keys()]
            col_names = ", ".join(columns)
            placeholders = ", ".join(["%s"] * len(columns))

            sql = f"""
                INSERT INTO anthropometry ({col_names})
                VALUES ({placeholders})
            """

            cur.execute(sql, tuple(data_with_uid.values()))
            conn.commit()
            return {"success": True}

def get_anthro_by_user(user_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM anthropometry
                WHERE user_id=%s ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            result = cur.fetchone()
            if result:
                result.pop("id", None)
                result.pop("user_id", None)
                result.pop("created_at", None)
            return result

# --- Посадка ---
def save_fit_settings(user_id, data):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO fit_settings (user_id, bike_id, name, "seatHight", "stemHight",
                                            "saddleOffset", "torsoAngle", "shifterAngle")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    user_id,
                    data["bike_id"],
                    data["name"],
                    data["seatHight"],
                    data["stemHight"],
                    data["saddleOffset"],
                    data["torsoAngle"],
                    data["shifterAngle"]
                ))
                conn.commit()
                return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_fit_by_name(fit_name, bike_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM fit_settings WHERE name=%s AND bike_id=%s", (fit_name, bike_id))
            return cur.fetchone()

def get_user_fits(user_id, bike_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT name FROM fit_settings WHERE user_id=%s AND bike_id=%s", (user_id, bike_id))
            return [row["name"] for row in cur.fetchall()]

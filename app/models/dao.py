import psycopg
from psycopg.rows import dict_row
from .db import get_conn
from werkzeug.security import generate_password_hash, check_password_hash
from flask import jsonify

# --- Пользователи ---
def create_user_account(username, password):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE username=%s", (username,))
                if cur.fetchone():
                    return {"success": False, "errors": [{"field": "username", "message": "Пользователь с таким именем уже существует"}]}
                password_hash = generate_password_hash(password)
                cur.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, password_hash))
                conn.commit()
                return {"success": True}
    except Exception as e:
        return {"success": False, "errors": [{"field": "general", "message": str(e)}]}

def authenticate_user(username, password):
    user = get_user_by_username(username)
    if user and check_password_hash(user["password_hash"], password):
        return {"id": user["id"], "role": user["role"]}
    return None

def get_user_by_username(username):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM users WHERE username=%s", (username,))
            return cur.fetchone()

# --- Велосипеды ---
def add_user_bike(user_id: int, bike: dict) -> dict:
    """Добавляет велосипед пользователя в базу данных, создавая модель и размер при необходимости."""

    try:
        with get_conn() as conn, conn.cursor() as cur:
            model_name = bike.get("model")
            size = bike.get("size")

            if not model_name or not size:
                return {"success": False, "errors": [{"field": "data", "message": "Model name and size are required"}]}

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
        return {"success": False, "errors": [{"field": "general", "message": str(e)}]}

def get_bike_geometry(size_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM bike_sizes WHERE id=%s", (size_id,))
            return cur.fetchone()

def get_visiable_bike_models(user_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM bike_models WHERE status = 'public' OR user_id=%s ORDER BY model", (user_id,))
            return cur.fetchall()

def get_user_bike_models(user_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM bike_models WHERE user_id=%s ORDER BY model", (user_id,))
            return cur.fetchall()

def get_pending_bikes():
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM bike_models WHERE status = 'pending' ORDER BY created_at")
            return cur.fetchall()

def set_bike_visibility(bike_id, is_public):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("UPDATE bike_models SET status = %s, is_moderated = TRUE WHERE id = %s", ('public' if is_public else 'private', bike_id))
            return {"success": True}   

def get_bike_sizes(bike_model_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute('SELECT size, id FROM bike_sizes WHERE bike_model_id = %s ORDER BY "seatTube"', (bike_model_id,))
            return cur.fetchall()

def get_bike_size_id(bike_model, size):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT bs.id FROM bike_sizes bs JOIN bike_models bm ON bs.bike_model_id = bm.id WHERE bm.model=%s AND bs.size=%s", (bike_model, size))
            row = cur.fetchone()
            return row["id"] if row else None

# --- Антропометрия ---
def add_user_anthropometry(user_id, data):
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

def get_latest_user_anthropometry(user_id):
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
                    data["size_id"],
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

def get_fit_by_name(fit_name, size_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM fit_settings WHERE name=%s AND bike_id=%s", (fit_name, size_id))
            return cur.fetchone()

def get_user_fits(user_id, size_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT name FROM fit_settings WHERE user_id=%s AND bike_id=%s", (user_id, size_id))
            return [row["name"] for row in cur.fetchall()]
        
def delete_user_bike(user_id, bike_id):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM bike_models WHERE id=%s AND user_id=%s", (bike_id, user_id))
            conn.commit()
            return {"success": True}
        
def set_bike_pending(bike_id, user_id):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE bike_models SET status = 'pending' WHERE id=%s AND user_id=%s", (bike_id, user_id))
            conn.commit()
            return {"success": True}

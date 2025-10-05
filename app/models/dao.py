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
        return {"id": user["id"]}
    return None

def get_user(username):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM users WHERE username=%s", (username,))
            return cur.fetchone()

# --- Велосипеды ---
def add_bike(user_id, bike: dict):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                bike_with_uid = {"user_id": user_id, **bike}

                columns = [f'"{col_name}"' for col_name in bike_with_uid.keys()]
                placeholders = ", ".join(["%s"] * len(columns))
                col_names = ", ".join(columns)

                sql = f"INSERT INTO bikes ({col_names}) VALUES ({placeholders})"

                print(sql)

                cur.execute(sql, tuple(bike_with_uid.values()))
                conn.commit()
                return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_bike_geo(bike_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM bikes WHERE id=%s", (bike_id,))
            return cur.fetchone()

def get_user_bikes(user_id):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT DISTINCT model FROM bikes WHERE user_id=%s", (user_id,))
            return [row["model"] for row in cur.fetchall()]

def get_bike_sizes(bike_model):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT size FROM bikes WHERE model=%s ORDER BY id", (bike_model,))
            return [row["size"] for row in cur.fetchall()]

def get_bike_id(bike_model, size):
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id FROM bikes WHERE model=%s AND size=%s", (bike_model, size))
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

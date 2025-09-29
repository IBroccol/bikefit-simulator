import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG
from werkzeug.security import generate_password_hash, check_password_hash

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def init_db():
    """Создаём таблицы, если их ещё нет"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bikes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            "model" VARCHAR,
            "size" VARCHAR,
            "seatTube" REAL,
            "seatAngle" REAL,
            "headTube" REAL,
            "headAngle" REAL,
            "bbdrop" REAL,
            "chainstay" REAL,
            "wheelbase" REAL,
            "stack" REAL,
            "reach" REAL,
            "rimD" REAL,
            "tyreW" REAL,
            "crankLen" REAL,
            "stemLen" REAL,
            "stemAngle" REAL,
            "minStemHight" REAL,
            "maxStemHight" REAL,
            "barReach" REAL,
            "barDrop" REAL,
            "shifterReach" REAL,
            "saddleLen" REAL,
            "saddleRailLen" REAL,
            "saddleHeight" REAL,
            "minseatpostLen" REAL,
            "maxseatpostLen" REAL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS anthropometry (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            "hip" REAL,
            "hipJointOffset" REAL,
            "lowerLeg" REAL,
            "heelToAnkle" REAL,
            "ankleToMetatarsal" REAL,
            "heelToMetatarsal" REAL,
            "toes" REAL,
            "soleHight" REAL,
            "torsoMax" REAL,
            "torsoMid" REAL,
            "torsoMin" REAL,
            "torsoMidAngle" REAL,
            "torsoMinAngle" REAL,
            "upperarm" REAL,
            "forearm" REAL,
            "neckLen" REAL,
            "headR" REAL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS fit_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            bike_id INTEGER REFERENCES bikes(id) ON DELETE CASCADE,
            name VARCHAR,
            "seatHight" REAL,
            "stemHight" REAL,
            "saddleOffset" REAL,
            "torsoAngle" REAL,
            "shifterAngle" REAL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

    conn.commit()
    cur.close()
    conn.close()

def create_user(username, password):
    conn = get_connection()
    cur = conn.cursor()
    password_hash = generate_password_hash(password)
    try:
        cur.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)",
                    (username, password_hash))
        conn.commit()
    except psycopg2.IntegrityError:
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()
    return True

def get_user(username):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user

def verify_user(username, password):
    user = get_user(username)
    if user and check_password_hash(user["password_hash"], password):
        return True
    return False

def add_bike(username, data):
    """Сохраняем геометрию велосипеда в БД для конкретного пользователя"""
    user = get_user(username)
    if not user:
        return False

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO bikes (
            user_id,
            "model", "size",
            "seatTube", "seatAngle", "headTube", "headAngle",
            "bbdrop", "chainstay", "wheelbase", "stack", "reach",
            "rimD", "tyreW", "crankLen",
            "stemLen", "stemAngle", "minStemHight", "maxStemHight",
            "barReach", "barDrop", "shifterReach",
            "saddleLen", "saddleRailLen", "saddleHeight",
            "minseatpostLen", "maxseatpostLen"
        ) VALUES (
            %s,
            %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s
        )
    """, (
        user["id"],
        data["model"], data["size"],
        data["seatTube"], data["seatAngle"], data["headTube"], data["headAngle"],
        data["bbdrop"], data["chainstay"], data["wheelbase"], data["stack"], data["reach"],
        data["rimD"], data["tyreW"], data["crankLen"],
        data["stemLen"], data["stemAngle"], data["minStemHight"], data["maxStemHight"],
        data["barReach"], data["barDrop"], data["shifterReach"],
        data["saddleLen"], data["saddleRailLen"], data["saddleHeight"],
        data["minseatpostLen"], data["maxseatpostLen"]
    ))

    conn.commit()
    cur.close()
    conn.close()
    return True

def add_anthropometry(username, data):
    """Сохраняем антропометрию пользователя"""
    user = get_user(username)
    if not user:
        return False

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO anthropometry (
            user_id,
            "hip", "hipJointOffset", "lowerLeg", "heelToAnkle",
            "ankleToMetatarsal", "heelToMetatarsal", "toes", "soleHight",
            "torsoMax", "torsoMid", "torsoMin", "torsoMidAngle", "torsoMinAngle",
            "upperarm", "forearm",
            "neckLen", "headR"
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s,
            %s, %s
        )
    """, (
        user["id"],
        data["hip"], data["hipJointOffset"], data["lowerLeg"], data["heelToAnkle"],
        data["ankleToMetatarsal"], data["heelToMetatarsal"], data["toes"], data["soleHight"],
        data["torsoMax"], data["torsoMid"], data["torsoMin"], data["torsoMidAngle"], data["torsoMinAngle"],
        data["upperarm"], data["forearm"],
        data["neckLen"], data["headR"]
    ))

    conn.commit()
    cur.close()
    conn.close()
    return True

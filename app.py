from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import psycopg2
import mimetypes

from utils.database import init_db, verify_user, create_user, get_user, add_bike, add_anthropometry, get_connection
from utils.geometry_calc import basic_fit

mimetypes.add_type('application/javascript', '.js')

app = Flask(__name__)
app.secret_key = "your_secret_key"
app.config.from_pyfile('config.py')

# Инициализация базы данных
init_db()

@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if verify_user(username, password):
            session["username"] = username
            return redirect(url_for("dashboard"))
        else:
            flash("Неверный логин или пароль", "danger")

    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if create_user(username, password):
            flash("Регистрация прошла успешно! Теперь войдите", "success")
            return redirect(url_for("login"))
        else:
            flash("Пользователь с таким логином уже существует", "danger")

    return render_template("register.html")

@app.route("/dashboard")
def dashboard():
    if "username" not in session:
        flash("Сначала войдите в систему", "danger")
        return redirect(url_for("login"))

    return render_template("dashboard.html", user_info={"username": session["username"]})

@app.route("/add_bike", methods=["GET", "POST"])
def add_bike_route():
    if "username" not in session:
        # если не авторизован — обычное поведение при GET
        if request.method == "GET":
            flash("Сначала войдите в систему", "danger")
            return redirect(url_for("login"))
        # если не авторизован при POST — JSON-ответ с ошибкой
        return jsonify({"status": "error", "message": "Необходима авторизация"}), 401

    if request.method == "POST":
        try:
            bikes = request.get_json()
            if not isinstance(bikes, list):
                return jsonify({"status": "error", "message": "Ожидался массив данных"}), 400

            ok_count = 0
            for bike in bikes:
                if add_bike(session["username"], bike):
                    ok_count += 1

            if ok_count == len(bikes):
                return jsonify({"status": "ok", "saved": ok_count})
            else:
                return jsonify({
                    "status": "partial",
                    "saved": ok_count,
                    "total": len(bikes)
                }), 207

        except Exception as e:
            print("Ошибка при добавлении велосипедов:", e)
            return jsonify({"status": "error", "message": "Ошибка при сохранении"}), 500

    # GET-запрос — просто отрисовываем страницу
    return render_template("add_bike.html")


@app.route("/add_anthro", methods=["GET", "POST"])
def add_anthro():
    if "username" not in session:
        flash("Сначала войдите в систему", "danger")
        return redirect(url_for("login"))

    if request.method == "POST":
        try:
            data = {k: float(request.form.get(k)) for k in request.form}
            if add_anthropometry(session["username"], data):
                flash("Антропометрические данные сохранены!", "success")
                return redirect(url_for("dashboard"))
            else:
                flash("Ошибка при сохранении данных", "danger")
        except ValueError:
            flash("Некорректные данные", "danger")

    return render_template("add_anthro.html")

@app.route("/canvas")
def canvas():
    if "username" not in session:
        flash("Сначала войдите в систему", "danger")
        return redirect(url_for("login"))

    user = get_user(session["username"])
    if not user:
        flash("Пользователь не найден", "danger")
        return redirect(url_for("login"))

    return render_template(
        "canvas.html",
        user_id=user["id"]
    )

@app.route("/save_fit", methods=["POST"])
def save_fit():
    if "username" not in session:
        return jsonify({"success": False, "error": "Не авторизован"})

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Нет данных"})

    try:
        user = get_user(session["username"])
        if not user:
            return jsonify({"success": False, "error": "Пользователь не найден"})

        save_fit_settings(user["id"], data)
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Ошибка при сохранении: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/get_fit_data', methods=['POST'])
def get_fit_data_route():
    try:
        data = request.get_json()
        fit_name = data.get('fit_name')
        bike_id = data.get('bike_id')
        
        if not fit_name:
            return jsonify({'error': 'No fit name provided'}), 400
        if not bike_id:
            return jsonify({'error': 'No bike id provided'}), 400
        
        fit_data = get_fit_by_name(fit_name, bike_id)
        if fit_data:
            return jsonify(fit_data)
        else:
            return jsonify({'error': 'Fit not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_basic_fit_data', methods = ['POST'])
def get_basic_fit_route():
    try:
        data = request.get_json()
        bike_id = data.get('bike_id')
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'No user id provided'}), 400
        if not bike_id:
            return jsonify({'error': 'No bike id provided'}), 400
        
        bike_geo = get_bike_by_id(bike_id)
        user_anthro = get_anthro_by_user(user_id)

        

        fit_data = basic_fit(bike_geo, user_anthro)
        if fit_data:
            return jsonify(fit_data)
        else:
            return jsonify({'error': 'Fit not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_fit_names', methods=['POST'])
def get_fit_names_route():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        bike_id = data.get('bike_id')

        if not user_id or not bike_id:
            return jsonify({'error': 'Missing parameters'}), 400
        
        fit_names = get_user_fits(user_id, bike_id)
        return jsonify(fit_names)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/get_bike_names', methods=['POST'])
def get_bike_names_route():
    try:
        data = request.get_json()
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({'error': 'No user ID provided'}), 400
        
        bike_names = get_user_bikes(user_id)
        return jsonify(bike_names)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/get_bike_sizes', methods=['POST'])
def get_bike_sizes_route():
    try:
        data = request.get_json()
        bike_model = data.get('bike_model')

        if not bike_model:
            return jsonify({'error': 'No bike model provided'}), 400
        
        sizes = get_bike_sizes(bike_model)
        return jsonify(sizes)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_bike_id', methods=['POST'])
def get_bike_id_route():
    try:
        data = request.get_json()
        bike_model = data.get('bike_model')
        size = data.get('size')

        if not bike_model:
            return jsonify({'error': 'No bike model provided'}), 400
        if not size:
            return jsonify({'error': 'No size provided'}), 400
        
        bike_id = get_bike_id(bike_model, size)
        return jsonify(bike_id)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_bike_geo', methods=['POST'])
def get_bike_geo_route():
    try:
        data = request.get_json()
        bike_id = data.get('bike_id')
        
        if not bike_id:
            return jsonify({'error': 'No bike id provided'}), 400
        
        print(bike_id)
        bike_data = get_bike_by_id(bike_id)
        if bike_data:
            return jsonify(bike_data)
        else:
            return jsonify({'error': 'Bike not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_anthro_data', methods=['POST'])
def get_anthro_data():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'No user id provided'}), 400
        
        anthro_data = get_anthro_by_user(user_id)
        if anthro_data:
            return jsonify(anthro_data)
        else:
            return jsonify({'error': 'Bike not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/logout")
def logout():
    session.pop("username", None)
    flash("Вы вышли из системы", "info")
    return redirect(url_for("login"))

def get_anthro_by_user(user_id):
    """Получить последние антропометрические данные пользователя"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM anthropometry WHERE user_id = %s
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            result = cur.fetchone()
            
            if result:
                result.pop('created_at', None)
                result.pop('id', None)
                result.pop('user_id', None)
                return result
            return None
    finally:
        conn.close()

def get_fit_data(user_id, bike_id, geometry_data, anthro_data):
    """Получить данные о посадке"""
    if not all([geometry_data, anthro_data]):
        return None, []
    


    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Проверяем есть ли сохраненные настройки
            cur.execute("""
                SELECT * FROM fit_settings 
                WHERE user_id = %s AND bike_id = %s
                ORDER BY created_at DESC LIMIT 1
            """, (user_id, bike_id))
            
            fit_data = cur.fetchone()
            
            if fit_data:
                fit_data.pop('created_at', None)
                fit_data.pop('id', None)
                fit_data.pop('user_id', None)
                fit_data.pop('bike_id', None)
                fit_data.pop('name', None)
            else:
                # Генерируем базовую посадку
                fit_data = basic_fit(geometry_data, anthro_data)
            
            # Получаем список сохраненных посадок
            cur.execute("""
                SELECT name FROM fit_settings 
                WHERE user_id = %s AND bike_id = %s
            """, (user_id, bike_id))
            
            saved_fittings = [row['name'] for row in cur.fetchall()]
            
            return fit_data, saved_fittings
    finally:
        conn.close()

def save_fit_settings(user_id, data):
    """Сохранить настройки посадки"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO fit_settings (
                    user_id, bike_id, name, "seatHight", "stemHight", 
                    "saddleOffset", "torsoAngle", "shifterAngle"
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                data["bike_id"],
                data['name'],
                data["seatHight"],
                data["stemHight"],
                data["saddleOffset"],
                data["torsoAngle"],
                data["shifterAngle"]
            ))
        conn.commit()
    finally:
        conn.close()

def get_fit_by_name(fit_name, bike_id):
    """Получить настройки посадки по имени"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM fit_settings WHERE name = %s and bike_id = %s", (fit_name, bike_id))
            return cur.fetchone()
    finally:
        conn.close()

def get_user_fits(user_id, bike_id):
    """Получить список посадок пользователя"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT name FROM fit_settings 
                WHERE user_id = %s AND bike_id = %s
            """, (user_id, bike_id))
            return [row['name'] for row in cur.fetchall()]
    finally:
        conn.close()

def get_user_bikes(user_id):
    """Получить список велосипедов пользователя"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT DISTINCT model FROM bikes WHERE user_id = %s", (user_id,))
            return [row['model'] for row in cur.fetchall()]
    finally:
        conn.close()

def get_bike_sizes(bike_model):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT size FROM bikes WHERE model = %s ORDER BY id", (bike_model,))
            return [row['size'] for row in cur.fetchall()]
    finally:
        conn.close() 

def get_bike_by_id(bike_id):
    """Получить данные велосипеда по ID"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM bikes WHERE id = %s", (bike_id,))
            return cur.fetchone()
    finally:
        conn.close()

def get_bike_id(bike_model, size):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id FROM bikes WHERE model = %s AND size = %s", (bike_model, size))
            return cur.fetchone()['id']
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(debug=True)
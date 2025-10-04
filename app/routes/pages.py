from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from app.models.dao import (
    verify_user, create_user, get_user,
    add_bike, add_anthropometry, get_anthro_by_user,
    save_fit_settings
)
from app.utils.geometry_calc import basic_fit

pages_bp = Blueprint("pages", __name__)

@pages_bp.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename, mimetype='text/javascript')

# -------------------- Login / Register --------------------

@pages_bp.route("/", methods=["GET", "POST"])
def login_page():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if verify_user(username, password):
            session["username"] = username
            return redirect(url_for("pages.dashboard"))
        else:
            flash("Неверный логин или пароль", "danger")

    return render_template("login.html")


@pages_bp.route("/register", methods=["GET", "POST"])
def register_page():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if create_user(username, password):
            flash("Регистрация прошла успешно! Теперь войдите", "success")
            return redirect(url_for("pages.login_page"))
        else:
            flash("Пользователь с таким логином уже существует", "danger")

    return render_template("register.html")


@pages_bp.route("/logout")
def logout_page():
    session.pop("username", None)
    flash("Вы вышли из системы", "info")
    return redirect(url_for("pages.login_page"))


# -------------------- Dashboard --------------------

@pages_bp.route("/dashboard")
def dashboard():
    if "username" not in session:
        flash("Сначала войдите в систему", "danger")
        return redirect(url_for("pages.login_page"))
    return render_template("dashboard.html", user_info={"username": session["username"]})


# -------------------- Add Bike --------------------

@pages_bp.route("/add_bike", methods=["GET", "POST"])
def add_bike_page():
    if "username" not in session:
        if request.method == "GET":
            flash("Сначала войдите в систему", "danger")
            return redirect(url_for("pages.login_page"))
        return jsonify({"status": "error", "message": "Необходима авторизация"}), 401

    if request.method == "POST":
        try:
            bikes = request.get_json()
            if not isinstance(bikes, list):
                return jsonify({"status": "error", "message": "Ожидался массив данных"}), 400

            user = get_user(session["username"])
            ok_count = 0
            for bike in bikes:
                if add_bike(user["id"], bike):
                    ok_count += 1

            if ok_count == len(bikes):
                return jsonify({"status": "ok", "saved": ok_count})
            else:
                return jsonify({"status": "partial", "saved": ok_count, "total": len(bikes)}), 207

        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    return render_template("add_bike.html")


# -------------------- Add Anthropometry --------------------

@pages_bp.route("/add_anthro", methods=["GET", "POST"])
def add_anthro_page():
    if "username" not in session:
        flash("Сначала войдите в систему", "danger")
        return redirect(url_for("pages.login_page"))

    if request.method == "POST":
        try:
            user = get_user(session["username"])
            data = {k: float(request.form.get(k)) for k in request.form}
            if add_anthropometry(user["id"], data):
                flash("Антропометрические данные сохранены!", "success")
                return redirect(url_for("pages.dashboard"))
            else:
                flash("Ошибка при сохранении данных", "danger")
        except ValueError:
            flash("Некорректные данные", "danger")

    return render_template("add_anthro.html")


# -------------------- Canvas / Fit --------------------

@pages_bp.route("/canvas")
def canvas_page():
    if "username" not in session:
        flash("Сначала войдите в систему", "danger")
        return redirect(url_for("pages.login_page"))

    user = get_user(session["username"])
    if not user:
        flash("Пользователь не найден", "danger")
        return redirect(url_for("pages.login_page"))

    return render_template("canvas.html", user_id=user["id"])


@pages_bp.route("/save_fit", methods=["POST"])
def save_fit_page():
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
        return jsonify({"success": False, "error": str(e)})


# -------------------- Utility --------------------

@pages_bp.context_processor
def inject_user():
    """Автоматически передаем username в шаблоны"""
    return dict(current_user=session.get("username"))

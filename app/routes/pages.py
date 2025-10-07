from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from app.models.dao import (
    verify_user, create_user, get_user,
    add_bike, add_anthropometry, get_anthro_by_user,
    save_fit_settings
)
from app.utils.geometry_calc import basic_fit
from app.utils.decorators import auth_required, role_required
from app.routes.auth import logout as auth_logout

pages_bp = Blueprint("pages", __name__)

@pages_bp.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename, mimetype='text/javascript')

# -------------------- Login / Register --------------------

@pages_bp.route("/", methods=["GET", "POST"])
def login_page():
    # if "user_id" in session:
        # return redirect(url_for("pages.dashboard"))
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
    res = auth_logout()
    print(res)
    if res[1] == 200:
        flash("Вы вышли из системы", "info")
    return redirect(url_for("pages.login_page"))


# -------------------- Dashboard --------------------

@pages_bp.route("/dashboard")
@auth_required
def dashboard():
    return render_template("dashboard.html")


# -------------------- Add Bike --------------------

@pages_bp.route("/add_bike")
@auth_required
def add_bike_page():
    return render_template("add_bike.html")


# -------------------- Add Anthropometry --------------------

@pages_bp.route("/add_anthro")
@auth_required
def add_anthro_page():
    return render_template("add_anthro.html")


# -------------------- Canvas / Fit --------------------

@pages_bp.route("/canvas")
@auth_required
def canvas_page():
    return render_template("canvas.html")

@pages_bp.route("/compare")
@auth_required
def compare_page():
    return render_template("compare.html")

@pages_bp.route("/save_fit", methods=["POST"])
@auth_required
def save_fit_page():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Нет данных"})

    user_id = session["user_id"]

    save_fit_settings(user_id, data)
    return jsonify({"success": True})

# -------------------- Moderation --------------------

@pages_bp.route("/moderation")
@role_required("moderator")
def moderation_page():
    print(session)
    return render_template("moderation.html")

# -------------------- Utility --------------------

@pages_bp.context_processor
def inject_user():
    """Автоматически передаем username в шаблоны"""
    return dict(current_user=session.get("user_id"))

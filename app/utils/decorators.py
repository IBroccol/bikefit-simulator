from functools import wraps
from flask import session, flash, redirect, url_for

def auth_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(session)
        if "user_id" not in session:
            flash("Сначала войдите в систему", "danger")
            return redirect(url_for("pages.login_page"))
        return func(*args, **kwargs)
    return wrapper

def role_required(required_role):
    def wrapper(func):
        @auth_required
        @wraps(func)
        def wrapper_1(*args, **kwargs):
            if "user_role" not in session:
                flash("Нет информации о правах пользователя", "danger")
                return redirect(url_for("pages.login_page"))
            
            user_role = session.get("user_role")
            if user_role != required_role:
                flash("У вас нет прав для доступа к этой странице", "danger")
                return redirect(url_for("pages.dashboard"))
            return func(*args, **kwargs)
        return wrapper_1
    return wrapper
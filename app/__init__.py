from flask import Flask
from app.routes import register_blueprints
from app.config import Config

def create_app():
    app = Flask(__name__, template_folder="templates")

    # Загружаем настройки из класса Config
    app.config.from_object(Config)

    # Регистрируем Blueprints
    register_blueprints(app)

    return app

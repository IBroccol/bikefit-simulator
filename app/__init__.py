import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from app.routes import register_blueprints
from app.config import Config

def create_app():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    react_dist = os.path.join(base_dir, "app", "static", "dist")
    legacy_static = os.path.join(base_dir, "app", "static")

    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        supports_credentials=True,
        origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    )

    register_blueprints(app)

    @app.route("/static/<path:filename>")
    def legacy_static_files(filename):
        return send_from_directory(legacy_static, filename)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        index = os.path.join(react_dist, "index.html")
        if os.path.exists(index):
            candidate = os.path.join(react_dist, path)
            if path and os.path.isfile(candidate):
                return send_from_directory(react_dist, path)
            return send_from_directory(react_dist, "index.html")
        return {"error": "React build not found. Run `npm run build` inside frontend/"}, 404

    return app

import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from app.routes import register_blueprints
from app.config import Config

def create_app():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # React production build is output to app/static/dist by `npm run build`
    react_dist = os.path.join(base_dir, "app", "static", "dist")

    # Legacy static assets (PNG hints, vanilla-JS canvas modules)
    legacy_static = os.path.join(base_dir, "app", "static")

    app = Flask(__name__)

    # Load settings from Config class
    app.config.from_object(Config)

    # CORS: allow the Vite dev server (port 5173) to make credentialed requests.
    # In production the React build is served by Flask itself, so CORS is not needed,
    # but we keep it here for the dev workflow.
    CORS(
        app,
        supports_credentials=True,
        origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    )

    # Register API blueprints (/auth, /bikes, /fits)
    register_blueprints(app)

    # Serve legacy static files (PNG hints, canvas JS modules) under /static/...
    # These are used by the vanilla-JS canvas_interface.js / canvas_drawer.js
    # that are dynamically injected by CanvasPage / ComparePage / ModerationPage.
    @app.route("/static/<path:filename>")
    def legacy_static_files(filename):
        return send_from_directory(legacy_static, filename)

    # SPA catch-all: every request that is NOT an API call and NOT a /static asset
    # gets served the React index.html so that client-side routing works.
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        index = os.path.join(react_dist, "index.html")
        if os.path.exists(index):
            # Try to serve a real file from the dist folder first (JS/CSS chunks, etc.)
            candidate = os.path.join(react_dist, path)
            if path and os.path.isfile(candidate):
                return send_from_directory(react_dist, path)
            return send_from_directory(react_dist, "index.html")
        # During development Flask is only the API server; Vite handles the SPA.
        return {"error": "React build not found. Run `npm run build` inside frontend/"}, 404

    return app

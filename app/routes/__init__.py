from .auth import auth_bp
from .bikes import bikes_bp
from .fits import fits_bp
from .pages import pages_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(bikes_bp)
    app.register_blueprint(fits_bp)
    app.register_blueprint(pages_bp)

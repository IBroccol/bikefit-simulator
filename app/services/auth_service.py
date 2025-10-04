from app.models import dao

def register_user(username, password):
    return dao.create_user(username, password)

def login_user(username, password):
    return dao.verify_user(username, password)

def get_user(username):
    return dao.get_user(username)

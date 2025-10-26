from app.models import dao

def create_user_account(username, password):
    return dao.create_user_account(username, password)

def authenticate_user(username, password):
    return dao.authenticate_user(username, password)

def get_user_by_username(username):
    return dao.get_user_by_username(username)

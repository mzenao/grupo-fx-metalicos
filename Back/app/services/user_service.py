from __future__ import annotations

from app.extensions import db
from app.models.user import User
from app.utils.security import hash_password
from app.utils.validators import is_valid_email, is_valid_role, normalize_string


def create_user(email: str, password: str, role: str, is_active: bool = True) -> User:
	clean_email = normalize_string(email)
	if not clean_email or not is_valid_email(clean_email):
		raise ValueError("Invalid email")

	if not password or len(password) < 6:
		raise ValueError("Password must have at least 6 characters")

	if not is_valid_role(role):
		raise ValueError("Invalid role")

	if User.query.filter_by(email=clean_email.lower()).first():
		raise ValueError("Email already in use")

	user = User(
		email=clean_email.lower(),
		password_hash=hash_password(password),
		role=role,
		is_active=is_active,
	)
	db.session.add(user)
	db.session.flush()
	return user


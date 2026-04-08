from __future__ import annotations

from datetime import datetime
from functools import wraps

from flask import g, request

from app.models.auth_token import AuthToken
from app.utils.response import error_response
from app.utils.token import hash_token


def _extract_bearer_token() -> str | None:
	auth_header = request.headers.get("Authorization", "")
	if not auth_header.startswith("Bearer "):
		return None
	return auth_header.split(" ", 1)[1].strip() or None


def login_required(view_func):
	@wraps(view_func)
	def wrapper(*args, **kwargs):
		raw_token = _extract_bearer_token()
		if not raw_token:
			return error_response("Unauthorized", {"token": "Missing bearer token"}, 401)

		token_hash = hash_token(raw_token)
		token_record = AuthToken.query.filter_by(token_hash=token_hash, revoked=False).first()

		if not token_record:
			return error_response("Unauthorized", {"token": "Invalid token"}, 401)

		if token_record.expires_at <= datetime.utcnow():
			return error_response("Unauthorized", {"token": "Expired token"}, 401)

		if not token_record.user.is_active:
			return error_response("Unauthorized", {"user": "Inactive user"}, 401)

		g.current_user = token_record.user
		g.current_token = token_record
		return view_func(*args, **kwargs)

	return wrapper


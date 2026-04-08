from functools import wraps

from flask import g

from app.utils.response import error_response


def roles_required(*allowed_roles: str):
	def decorator(view_func):
		@wraps(view_func)
		def wrapper(*args, **kwargs):
			current_user = getattr(g, "current_user", None)
			if current_user is None:
				return error_response("Unauthorized", {"user": "Missing authenticated user"}, 401)

			if current_user.role not in allowed_roles:
				return error_response("Forbidden", {"role": "Insufficient permissions"}, 403)

			return view_func(*args, **kwargs)

		return wrapper

	return decorator


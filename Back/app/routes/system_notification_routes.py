from flask import Blueprint, request

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.services.system_notification_service import list_recent_system_notifications
from app.utils.response import success_response


system_notifications_bp = Blueprint("system_notifications", __name__)


@system_notifications_bp.get("")
@login_required
@roles_required("admin", "employee")
def list_system_notifications_route():
	limit = request.args.get("limit", default=20, type=int)
	return success_response(
		"System notifications fetched successfully",
		list_recent_system_notifications(limit),
	)
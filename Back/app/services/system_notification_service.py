from __future__ import annotations

from app.extensions import db
from app.models.system_notification import SystemNotification


def create_system_notification(
	*,
	event_type: str,
	title: str,
	message: str,
	entity_type: str | None = None,
	entity_id: int | None = None,
	actor_user_id: int | None = None,
	details: dict | None = None,
) -> SystemNotification:
	notification = SystemNotification(
		event_type=event_type,
		title=title,
		message=message,
		entity_type=entity_type,
		entity_id=entity_id,
		actor_user_id=actor_user_id,
		details=details or {},
	)
	db.session.add(notification)
	db.session.commit()
	return notification


def list_recent_system_notifications(limit: int = 20) -> list[dict]:
	limit = max(1, min(int(limit or 20), 50))
	notifications = (
		SystemNotification.query.order_by(SystemNotification.created_at.desc(), SystemNotification.id.desc())
		.limit(limit)
		.all()
	)
	return [notification.to_dict() for notification in notifications]
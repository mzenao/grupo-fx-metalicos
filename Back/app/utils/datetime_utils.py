from datetime import datetime, timedelta, timezone


BRASILIA_TZ = timezone(timedelta(hours=-3))


def parse_iso_datetime(value: str) -> datetime:
	if value is None or value == "":
		raise ValueError("Datetime is required")

	dt = datetime.fromisoformat(value)
	if dt.tzinfo is not None:
		dt = dt.astimezone(BRASILIA_TZ).replace(tzinfo=None)
	return dt


def format_brasilia_datetime(value: datetime) -> str:
	if value.tzinfo is not None:
		return value.astimezone(BRASILIA_TZ).isoformat()
	return value.replace(tzinfo=BRASILIA_TZ).isoformat()


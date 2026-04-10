from sqlalchemy import text

from app import create_app
from app.extensions import db


TABLES_WITH_ID = (
	"users",
	"employees",
	"suppliers",
	"material_types",
	"purchases",
	"purchase_attachments",
)


def sync_sequences() -> None:
	if db.engine.dialect.name != "postgresql":
		print("Sequence sync skipped: database is not PostgreSQL")
		return

	for table_name in TABLES_WITH_ID:
		sequence_name = db.session.execute(
			text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
			{"table_name": table_name},
		).scalar()
		if not sequence_name:
			continue

		max_id = db.session.execute(
			text(f"SELECT COALESCE(MAX(id), 0) FROM {table_name}"),
		).scalar()
		max_id_int = int(max_id or 0)
		next_value = max_id_int if max_id_int > 0 else 1
		is_called = max_id_int > 0

		db.session.execute(
			text("SELECT setval(CAST(:sequence_name AS regclass), :next_value, :is_called)"),
			{
				"sequence_name": sequence_name,
				"next_value": next_value,
				"is_called": is_called,
			},
		)

	db.session.commit()
	print("Primary key sequences synchronized")


def main() -> None:
	app = create_app()
	with app.app_context():
		sync_sequences()


if __name__ == "__main__":
	main()
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
BACK_DIR = SCRIPT_DIR.parent
if str(BACK_DIR) not in sys.path:
	sys.path.insert(0, str(BACK_DIR))

from app import create_app
from app.extensions import db
from app.models.material_type import MaterialType


DEFAULT_TYPES = [
	"Mixed metal",
	"Copper",
	"Aluminum",
	"Iron",
	"Plastic",
]


def run() -> None:
	app = create_app()
	with app.app_context():
		created = 0
		for label in DEFAULT_TYPES:
			if MaterialType.query.filter_by(label=label).first():
				continue
			db.session.add(MaterialType(label=label))
			created += 1

		db.session.commit()
		print(f"Material types created: {created}")


if __name__ == "__main__":
	run()


from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
BACK_DIR = SCRIPT_DIR.parent
if str(BACK_DIR) not in sys.path:
    sys.path.insert(0, str(BACK_DIR))

from app import create_app
from app.services.backup_service import BackupService


def run() -> None:
    app = create_app()
    with app.app_context():
        backup_service = BackupService()
        dump_path = backup_service.create_database_dump(output_dir=str(Path("backups")))
        print(f"Backup created: {dump_path}")


if __name__ == "__main__":
    run()

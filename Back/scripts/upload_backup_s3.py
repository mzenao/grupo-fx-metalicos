import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACK_DIR = SCRIPT_DIR.parent
if str(BACK_DIR) not in sys.path:
	sys.path.insert(0, str(BACK_DIR))

from app import create_app
from app.services.backup_service import BackupService


def run(file_path: str) -> None:
	try:
		app = create_app()
		with app.app_context():
			backup_service = BackupService()
			print(f"[backup] Starting upload of {file_path}")
			result = backup_service.upload_backup_to_s3(file_path=file_path)
			print(f"[backup] Uploaded backup to s3://{result['bucket']}/{result['key']}")
	except Exception as e:
		print(f"[ERROR] Upload failed: {str(e)}")
		import traceback
		traceback.print_exc()
		exit(1)


if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument("file_path", help="Local backup file path")
	args = parser.parse_args()
	run(args.file_path)


import argparse

from app import create_app
from app.services.backup_service import BackupService


def run(file_path: str) -> None:
	app = create_app()
	with app.app_context():
		backup_service = BackupService()
		result = backup_service.upload_backup_to_s3(file_path=file_path)
		print(f"Uploaded backup to s3://{result['bucket']}/{result['key']}")


if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument("file_path", help="Local backup file path")
	args = parser.parse_args()
	run(args.file_path)


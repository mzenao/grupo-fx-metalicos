from app import create_app
from app.extensions import db
from app.models.user import User
from app.utils.security import hash_password


def run() -> None:
	app = create_app()
	with app.app_context():
		email = "admin@local.dev"
		if User.query.filter_by(email=email).first():
			print("Admin already exists")
			return

		admin = User(
			email=email,
			password_hash=hash_password("admin123"),
			role="admin",
			is_active=True,
		)
		db.session.add(admin)
		db.session.commit()
		print("Admin created successfully")


if __name__ == "__main__":
	run()


from pathlib import Path
import os

from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db, migrate


def create_app(config_class: type[Config] = Config) -> Flask:
	app = Flask(__name__)
	app.config.from_object(config_class)

	Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

	db.init_app(app)
	migrate.init_app(app, db)
	allowed_origins = [
		origin.strip()
		for origin in os.getenv("CORS_ORIGINS", "*").split(",")
		if origin.strip()
	]
	CORS(
		app,
		resources={r"/api/*": {"origins": allowed_origins}},
		allow_headers=["Content-Type", "Authorization"],
		methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	)

	from app.middlewares.error_handler import register_error_handlers
	from app.routes import register_blueprints

	register_blueprints(app)
	register_error_handlers(app)

	return app


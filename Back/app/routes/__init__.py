from flask import Flask

from app.routes.auth_routes import auth_bp
from app.routes.employee_routes import employee_bp
from app.routes.health_routes import health_bp
from app.routes.material_type_routes import material_type_bp
from app.routes.purchase_routes import purchase_bp
from app.routes.supplier_routes import supplier_bp

try:
	from app.routes.attachment_routes import attachment_bp
except ImportError:
	from app.routes.purchase_attachments_routes import attachment_bp


def register_blueprints(app: Flask) -> None:
	app.register_blueprint(health_bp, url_prefix="/api")
	app.register_blueprint(auth_bp, url_prefix="/api/auth")
	app.register_blueprint(employee_bp, url_prefix="/api/employees")
	app.register_blueprint(supplier_bp, url_prefix="/api/suppliers")
	app.register_blueprint(material_type_bp, url_prefix="/api/material-types")
	app.register_blueprint(purchase_bp, url_prefix="/api/purchases")
	app.register_blueprint(attachment_bp, url_prefix="/api/attachments")


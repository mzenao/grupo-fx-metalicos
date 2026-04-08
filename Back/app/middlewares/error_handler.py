from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.utils.response import error_response


def register_error_handlers(app):
	@app.errorhandler(404)
	def not_found(_):
		return error_response("Resource not found", status_code=404)

	@app.errorhandler(405)
	def method_not_allowed(_):
		return error_response("Method not allowed", status_code=405)

	@app.errorhandler(IntegrityError)
	def handle_integrity_error(exc):
		db.session.rollback()
		return error_response("Database integrity error", {"detail": str(exc.orig)}, 400)

	@app.errorhandler(ValueError)
	def handle_value_error(exc):
		return error_response("Validation error", {"detail": str(exc)}, 400)

	@app.errorhandler(Exception)
	def handle_unexpected_error(exc):
		return error_response("Internal server error", {"detail": str(exc)}, 500)


from typing import Any

from flask import jsonify


def success_response(message: str, data: Any = None, status_code: int = 200):
	return (
		jsonify(
			{
				"success": True,
				"message": message,
				"data": data,
			}
		),
		status_code,
	)


def error_response(message: str, errors: Any = None, status_code: int = 400):
	return (
		jsonify(
			{
				"success": False,
				"message": message,
				"errors": errors,
			}
		),
		status_code,
	)


from flask import Blueprint, g, request

from app.middlewares.auth_middleware import login_required
from app.services.auth_service import (
	get_me,
	login,
	logout,
	register_supplier,
	request_password_reset,
	reset_password,
	update_me,
)
from app.services.supplier_service import check_supplier_availability
from app.utils.response import success_response


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login_route():
	payload = request.get_json(silent=True) or {}
	result = login(
		email=payload.get("email", ""),
		password=payload.get("password", ""),
		remember_me=bool(payload.get("remember_me", False)),
	)
	return success_response("Login successful", result, 200)


@auth_bp.post("/register-supplier")
def register_supplier_route():
	payload = request.get_json(silent=True) or {}
	result = register_supplier(payload)
	return success_response("Supplier account created successfully", result, 201)


@auth_bp.post("/check-supplier-availability")
def check_supplier_availability_route():
	payload = request.get_json(silent=True) or {}
	check_supplier_availability(payload)
	return success_response("Supplier data is available", {"available": True}, 200)


@auth_bp.post("/forgot-password")
def forgot_password_route():
	payload = request.get_json(silent=True) or {}
	request_password_reset(
		email=payload.get("email", ""),
		app_url=payload.get("app_url", ""),
	)
	return success_response("Password reset instructions sent", None, 200)


@auth_bp.post("/reset-password")
def reset_password_route():
	payload = request.get_json(silent=True) or {}
	reset_password(
		token=payload.get("token", ""),
		password=payload.get("password", ""),
	)
	return success_response("Password reset successfully", None, 200)


@auth_bp.post("/logout")
@login_required
def logout_route():
	logout(g.current_token)
	return success_response("Logout successful", None, 200)


@auth_bp.get("/me")
@login_required
def me_route():
	return success_response("Authenticated user", get_me(g.current_user), 200)


@auth_bp.put("/me")
@login_required
def update_me_route():
	payload = request.get_json(silent=True) or {}
	updated = update_me(g.current_user, payload)
	return success_response("Account updated successfully", updated, 200)

from flask import Blueprint, request

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.services.employee_service import (
	create_employee,
	delete_employee,
	get_employee,
	list_employees,
	update_employee,
)
from app.utils.response import success_response


employee_bp = Blueprint("employees", __name__)


@employee_bp.get("")
@login_required
@roles_required("admin", "employee")
def list_employees_route():
	return success_response("Employees fetched successfully", list_employees())


@employee_bp.get("/<int:employee_id>")
@login_required
@roles_required("admin", "employee")
def get_employee_route(employee_id: int):
	return success_response("Employee fetched successfully", get_employee(employee_id).to_dict())


@employee_bp.post("")
@login_required
@roles_required("admin", "employee")
def create_employee_route():
	payload = request.get_json(silent=True) or {}
	employee = create_employee(payload)
	return success_response("Employee created successfully", employee.to_dict(), 201)


@employee_bp.put("/<int:employee_id>")
@login_required
@roles_required("admin", "employee")
def update_employee_route(employee_id: int):
	payload = request.get_json(silent=True) or {}
	employee = update_employee(employee_id, payload)
	return success_response("Employee updated successfully", employee.to_dict())


@employee_bp.delete("/<int:employee_id>")
@login_required
@roles_required("admin", "employee")
def delete_employee_route(employee_id: int):
	delete_employee(employee_id)
	return success_response("Employee deleted successfully", None)


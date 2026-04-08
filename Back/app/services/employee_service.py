from __future__ import annotations

from app.extensions import db
from app.models.employee import Employee
from app.models.user import User
from app.services.user_service import create_user
from app.utils.validators import is_valid_phone, normalize_string


def list_employees() -> list[dict]:
	employees = Employee.query.order_by(Employee.id.desc()).all()
	return [employee.to_dict() for employee in employees]


def get_employee(employee_id: int) -> Employee:
	employee = Employee.query.get(employee_id)
	if not employee:
		raise ValueError("Employee not found")
	return employee


def create_employee(payload: dict) -> Employee:
	name = normalize_string(payload.get("name"))
	phone = normalize_string(payload.get("phone"))
	occupation = normalize_string(payload.get("occupation"))

	if not name:
		raise ValueError("Name is required")
	if not is_valid_phone(phone):
		raise ValueError("Invalid phone")

	user_id = payload.get("user_id")
	if user_id:
		user = User.query.get(user_id)
		if not user:
			raise ValueError("User not found")
		if user.role != "employee":
			raise ValueError("User role must be employee")
		if user.employee:
			raise ValueError("User already linked to an employee")
	else:
		user = create_user(
			email=payload.get("email", ""),
			password=payload.get("password", ""),
			role="employee",
			is_active=bool(payload.get("is_active", True)),
		)

	employee = Employee(
		user_id=user.id,
		name=name,
		phone=phone,
		occupation=occupation,
	)
	db.session.add(employee)
	db.session.commit()
	return employee


def update_employee(employee_id: int, payload: dict) -> Employee:
	employee = get_employee(employee_id)

	if "name" in payload:
		employee.name = normalize_string(payload.get("name")) or employee.name
	if "phone" in payload:
		phone = normalize_string(payload.get("phone"))
		if not is_valid_phone(phone):
			raise ValueError("Invalid phone")
		employee.phone = phone
	if "occupation" in payload:
		employee.occupation = normalize_string(payload.get("occupation"))

	if "email" in payload:
		email = normalize_string(payload.get("email"))
		if email and User.query.filter(User.email == email.lower(), User.id != employee.user_id).first():
			raise ValueError("Email already in use")
		if email:
			employee.user.email = email.lower()

	if "is_active" in payload:
		employee.user.is_active = bool(payload.get("is_active"))

	db.session.commit()
	return employee


def delete_employee(employee_id: int) -> None:
	employee = get_employee(employee_id)
	user = employee.user
	db.session.delete(employee)
	if user:
		db.session.delete(user)
	db.session.commit()


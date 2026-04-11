from flask import Blueprint, g, request

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.services.supplier_service import (
	create_supplier,
	delete_supplier,
	get_supplier,
	list_suppliers,
	update_supplier,
)
from app.utils.response import success_response
from app.utils.security import verify_password


supplier_bp = Blueprint("suppliers", __name__)


def _require_current_password_for_delete() -> None:
	payload = request.get_json(silent=True) or {}
	current_password = str(payload.get("current_password") or "").strip()
	current_user = getattr(g, "current_user", None)

	if not current_password:
		raise ValueError("Senha atual obrigatoria para exclusao")

	if not current_user or not verify_password(current_user.password_hash, current_password):
		raise ValueError("Senha atual invalida")


@supplier_bp.get("")
@login_required
@roles_required("admin", "employee")
def list_suppliers_route():
	return success_response("Suppliers fetched successfully", list_suppliers())


@supplier_bp.get("/<int:supplier_id>")
@login_required
@roles_required("admin", "employee", "supplier")
def get_supplier_route(supplier_id: int):
	return success_response("Supplier fetched successfully", get_supplier(supplier_id).to_dict())


@supplier_bp.post("")
@login_required
@roles_required("admin", "employee")
def create_supplier_route():
	payload = request.get_json(silent=True) or {}
	supplier = create_supplier(payload)
	return success_response("Supplier created successfully", supplier.to_dict(), 201)


@supplier_bp.put("/<int:supplier_id>")
@login_required
@roles_required("admin", "employee")
def update_supplier_route(supplier_id: int):
	payload = request.get_json(silent=True) or {}
	supplier = update_supplier(supplier_id, payload)
	return success_response("Supplier updated successfully", supplier.to_dict())


@supplier_bp.delete("/<int:supplier_id>")
@login_required
@roles_required("admin", "employee")
def delete_supplier_route(supplier_id: int):
	_require_current_password_for_delete()
	delete_supplier(supplier_id)
	return success_response("Supplier deleted successfully", None)


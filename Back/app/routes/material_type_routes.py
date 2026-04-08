from flask import Blueprint, request

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.services.material_type_service import create_material_type, list_material_types
from app.utils.response import success_response


material_type_bp = Blueprint("material_types", __name__)


@material_type_bp.get("")
@login_required
def list_material_types_route():
	return success_response("Material types fetched successfully", list_material_types())


@material_type_bp.post("")
@login_required
@roles_required("admin", "employee")
def create_material_type_route():
	payload = request.get_json(silent=True) or {}
	material_type = create_material_type(payload)
	return success_response("Material type created successfully", material_type.to_dict(), 201)


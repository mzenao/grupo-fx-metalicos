from __future__ import annotations

from app.extensions import db
from app.models.material_type import MaterialType
from app.utils.validators import normalize_string


def list_material_types() -> list[dict]:
    material_types = MaterialType.query.order_by(MaterialType.label.asc()).all()
    return [item.to_dict() for item in material_types]


def create_material_type(payload: dict) -> MaterialType:
    label = normalize_string(payload.get("label"))
    if not label:
        raise ValueError("Label is required")

    existing = MaterialType.query.filter(db.func.lower(MaterialType.label) == label.lower()).first()
    if existing:
        raise ValueError("Material type label already exists")

    material_type = MaterialType(label=label)
    db.session.add(material_type)
    db.session.commit()
    return material_type

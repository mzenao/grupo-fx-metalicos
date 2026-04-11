from pathlib import Path

from flask import Blueprint, g, request
from flask import redirect, send_file

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.services.storage_service import resolve_attachment_source
from app.services.attachment_service import delete_attachment, get_attachment, upload_attachment
from app.utils.response import success_response
from app.utils.security import verify_password


attachment_bp = Blueprint("attachments", __name__)


def _require_current_password_for_delete() -> None:
    payload = request.get_json(silent=True) or {}
    current_password = str(payload.get("current_password") or "").strip()
    current_user = getattr(g, "current_user", None)

    if not current_password:
        raise ValueError("Senha atual obrigatoria para exclusao")

    if not current_user or not verify_password(current_user.password_hash, current_password):
        raise ValueError("Senha atual invalida")


@attachment_bp.post("/upload")
@login_required
@roles_required("admin", "employee")
def upload_attachment_route():
    file = request.files.get("file")
    purchase_id = request.form.get("purchase_id", type=int)
    attachment_type = request.form.get("attachment_type")

    if purchase_id is None:
        raise ValueError("purchase_id is required")

    attachment = upload_attachment(
        purchase_id=purchase_id,
        file=file,
        attachment_type=attachment_type,
    )
    return success_response("Attachment uploaded successfully", attachment.to_dict(), 201)


@attachment_bp.get("/<int:attachment_id>")
@login_required
def get_attachment_route(attachment_id: int):
    attachment = get_attachment(attachment_id)
    return success_response("Attachment fetched successfully", attachment.to_dict(), 200)


@attachment_bp.get("/<int:attachment_id>/file")
@login_required
def get_attachment_file_route(attachment_id: int):
    attachment = get_attachment(attachment_id)
    file_path = attachment.file_path or ""

    resolved_source = resolve_attachment_source(file_path)

    if resolved_source and (resolved_source.startswith("http://") or resolved_source.startswith("https://")):
        return redirect(resolved_source, code=302)

    if not resolved_source or not Path(resolved_source).exists():
        raise ValueError("Attachment file not found")

    return send_file(
        resolved_source,
        mimetype=attachment.file_type or None,
        as_attachment=False,
        download_name=attachment.file_name,
    )


@attachment_bp.delete("/<int:attachment_id>")
@login_required
@roles_required("admin", "employee")
def delete_attachment_route(attachment_id: int):
    _require_current_password_for_delete()
    delete_attachment(attachment_id)
    return success_response("Attachment deleted successfully", None, 200)

"""Read-only supplier reporting over the existing purchase/advance records."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import re

from sqlalchemy import func
from sqlalchemy.orm import joinedload, selectinload
from werkzeug.exceptions import NotFound

from app.extensions import db
from app.models.advance import Advance
from app.models.purchase import Purchase
from app.models.supplier import Supplier
from app.utils.datetime_utils import format_brasilia_datetime


PAGE_SIZE = 20
ZERO = Decimal("0")


def _date_filter(value, label):
    if not value:
        return None
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError
        parsed = date.fromisoformat(value)
        if parsed.year == 9999:
            raise ValueError
        return parsed
    except ValueError:
        raise ValueError(f"Informe uma data válida para {label} (AAAA-MM-DD).") from None


def _filter_period(query, column, start, end):
    if start:
        query = query.filter(column >= datetime.combine(start, time.min))
    if end:
        query = query.filter(column < datetime.combine(end + timedelta(days=1), time.min))
    return query


def _total(records, field):
    return sum((getattr(record, field) or ZERO for record in records), ZERO)


def _movement(kind, record):
    data = record.to_dict()
    when = record.purchase_datetime if kind == "purchase" else record.advance_datetime
    data.update({
        "type": kind,
        "datetime": format_brasilia_datetime(when),
        "employee_name": record.employee.name if record.employee else "—",
    })
    if kind == "purchase":
        data["material_name"] = record.material_type.label if record.material_type else "—"
    return data


def get_supplier_history(supplier_id, params):
    start = _date_filter(params.get("start"), "o início")
    end = _date_filter(params.get("end"), "o fim")
    if start and end and start > end:
        raise ValueError("A data inicial não pode ser posterior à data final.")
    kind = params.get("type", "all")
    status = params.get("status", "all")
    if kind not in ("all", "purchase", "advance"):
        raise ValueError("Tipo de movimentação inválido.")
    if status not in ("all", "pendente", "finalizado"):
        raise ValueError("Situação do adiantamento inválida.")
    try:
        page = int(params.get("page", "1"))
        if page < 1:
            raise ValueError
    except (ValueError, TypeError):
        raise ValueError("Informe uma página válida.") from None

    supplier = db.session.get(Supplier, supplier_id)
    if supplier is None:
        raise NotFound()

    # Current balances must never inherit the report's date/type/status filters.
    debt = db.session.query(func.sum(Advance.value_remaining)).filter(
        Advance.supplier_id == supplier_id,
    ).scalar() or ZERO

    purchases = []
    if kind != "advance":
        query = Purchase.query.filter_by(supplier_id=supplier_id).options(
            joinedload(Purchase.supplier), joinedload(Purchase.employee),
            joinedload(Purchase.material_type), selectinload(Purchase.attachments),
        )
        purchases = _filter_period(query, Purchase.purchase_datetime, start, end).all()

    advances = []
    if kind != "purchase":
        query = Advance.query.filter_by(supplier_id=supplier_id).options(
            joinedload(Advance.supplier), joinedload(Advance.employee), selectinload(Advance.attachments),
        )
        if status != "all":
            query = query.filter(Advance.status == status)
        advances = _filter_period(query, Advance.advance_datetime, start, end).all()

    summary = {
        "purchase_count": len(purchases),
        "purchase_value": float(_total(purchases, "value")),
        "weight": float(_total(purchases, "weight")),
        "advance_count": len(advances),
        "advance_value": float(_total(advances, "value_total")),
        "abatement_value": float(_total(purchases, "advance_abatement_value")),
    }

    chart_series = {
        "sales": [{
            "id": purchase.id,
            "datetime": format_brasilia_datetime(purchase.purchase_datetime),
            "value": float(purchase.value),
            "value_per_kg": float(purchase.value_per_kg),
        } for purchase in sorted(purchases, key=lambda item: (item.purchase_datetime, item.id))],
        "advances": [{
            "id": advance.id,
            "datetime": format_brasilia_datetime(advance.advance_datetime),
            "value": float(advance.value_total),
        } for advance in sorted(advances, key=lambda item: (item.advance_datetime, item.id))],
    }

    monthly = {}
    records = []
    for record_kind, items, date_field, value_field in (
        ("purchase", purchases, "purchase_datetime", "value"),
        ("advance", advances, "advance_datetime", "value_total"),
    ):
        for record in items:
            when = getattr(record, date_field)
            month = when.strftime("%Y-%m")
            bucket = monthly.setdefault(month, {"purchase_value": ZERO, "advance_value": ZERO})
            bucket[f"{record_kind}_value"] += getattr(record, value_field) or ZERO
            records.append((when, record_kind, record.id, record))

    records.sort(key=lambda item: item[:3], reverse=True)
    total = len(records)
    pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
    page = min(page, pages)
    visible = records[(page - 1) * PAGE_SIZE:page * PAGE_SIZE]

    return {
        "supplier": supplier.to_dict(),
        "balances": {"positive": float(supplier.advance_credit_balance or ZERO), "negative": float(debt)},
        "summary": summary,
        "chart_series": chart_series,
        "series": [{"month": month, **{key: float(value) for key, value in values.items()}}
                   for month, values in sorted(monthly.items())],
        "movements": [_movement(record_kind, record) for _, record_kind, _, record in visible],
        "pagination": {"page": page, "per_page": PAGE_SIZE, "pages": pages, "total": total},
    }

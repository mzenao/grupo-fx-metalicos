from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class MaterialType(db.Model):
	__tablename__ = "material_types"

	id: Mapped[int] = mapped_column(db.BigInteger, primary_key=True)
	label: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

	purchases = relationship("Purchase", back_populates="material_type")

	def to_dict(self) -> dict:
		return {
			"id": self.id,
			"label": self.label,
		}


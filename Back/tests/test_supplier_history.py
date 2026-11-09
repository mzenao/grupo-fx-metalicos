"""Integration tests use only an isolated in-memory database."""
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Advance, AuthToken, Employee, MaterialType, Purchase, Supplier, User
from app.utils.token import hash_token


class SupplierHistoryTests(unittest.TestCase):
    def setUp(self):
        self.uploads = tempfile.TemporaryDirectory()

        class TestConfig(Config):
            TESTING = True
            SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
            STORAGE_BACKEND = "local"
            UPLOAD_FOLDER = self.uploads.name

        self.app = create_app(TestConfig)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        for id_, role in [(1, "admin"), (2, "employee"), (3, "supplier"), (4, "supplier"), (5, "supplier")]:
            db.session.add(User(id=id_, email=f"user{id_}@example.test", password_hash="unused", role=role))
            db.session.add(AuthToken(user_id=id_, token_hash=hash_token(f"test-{id_}"), expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)))
        db.session.add(Employee(id=1, user_id=2, name="Funcionário Teste"))
        for id_, user_id in [(1, 3), (2, 4), (3, 5)]:
            db.session.add(Supplier(id=id_, user_id=user_id, supplier_code=200 + id_, is_pf=True,
                                    name=f"Fornecedor {id_}", cpf=str(id_) * 11, pix_key_type="cpf",
                                    pix_key_value=str(id_) * 11, advance_credit_balance=50 if id_ == 1 else 0))
        db.session.add(MaterialType(id=1, label="Ferro"))
        db.session.add_all([
            Advance(id=1, supplier_id=1, employee_id=1, value_total=1000, value_remaining=200,
                    advance_datetime=datetime(2026, 10, 30, 10), status="pendente"),
            Advance(id=2, supplier_id=1, employee_id=1, value_total=500, value_remaining=0,
                    advance_datetime=datetime(2026, 11, 2, 10), status="finalizado"),
            Advance(id=3, supplier_id=2, employee_id=1, value_total=9000, value_remaining=9000,
                    advance_datetime=datetime(2026, 11, 2, 10)),
        ])
        db.session.add_all([
            self.purchase(1, datetime(2026, 11, 4, 0), 100, 300.10, abatement=100),
            self.purchase(2, datetime(2026, 11, 4, 23, 59, 59), 200, 600.20),
            self.purchase(3, datetime(2026, 11, 5, 0), 50, 150),
            self.purchase(4, datetime(2026, 11, 4, 10), 999, 9999, supplier_id=2),
        ])
        db.session.commit()
        self.client = self.app.test_client()

    @staticmethod
    def purchase(id_, when, weight, value, supplier_id=1, abatement=0):
        return Purchase(id=id_, supplier_id=supplier_id, employee_id=1, material_type_id=1,
                        weight=weight, value=value, value_per_kg=3, purchase_datetime=when,
                        advance_id=1 if abatement else None, advance_abatement_value=abatement,
                        advance_applied_value=abatement)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()
        self.uploads.cleanup()

    def get(self, query="", user=1, supplier=1):
        headers = {"Authorization": f"Bearer test-{user}"} if user else {}
        return self.client.get(f"/api/suppliers/{supplier}/history{query}", headers=headers)

    def data(self, query="", **kwargs):
        response = self.get(query, **kwargs)
        self.assertEqual(response.status_code, 200, response.json)
        return response.json["data"]

    def test_rejects_visitors_and_suppliers(self):
        self.assertEqual(self.get(user=None).status_code, 401)
        self.assertEqual(self.get(user=3).status_code, 403)

    def test_staff_can_read_only_selected_supplier(self):
        for user in (1, 2):
            data = self.data(user=user)
            self.assertEqual(data["supplier"]["id"], 1)
            self.assertEqual(data["pagination"]["total"], 5)
            self.assertEqual(data["summary"]["purchase_value"], 1050.30)
            self.assertEqual(data["summary"]["purchase_count"], 3)
            self.assertEqual(data["summary"]["weight"], 350)
            self.assertEqual(data["summary"]["advance_value"], 1500)
            self.assertEqual(data["summary"]["abatement_value"], 100)
            self.assertEqual(data["balances"], {"positive": 50, "negative": 200})
            self.assertEqual([(x["type"], x["id"]) for x in data["movements"]],
                             [("purchase", 3), ("purchase", 2), ("purchase", 1), ("advance", 2), ("advance", 1)])

    def test_period_includes_both_day_boundaries_and_keeps_current_balances(self):
        data = self.data("?start=2026-11-04&end=2026-11-04")
        self.assertEqual(data["summary"]["purchase_value"], 900.30)
        self.assertEqual(data["summary"]["purchase_count"], 2)
        self.assertEqual(data["summary"]["advance_value"], 0)
        self.assertEqual(data["balances"]["negative"], 200)
        self.assertEqual(data["series"], [{"month": "2026-11", "purchase_value": 900.30, "advance_value": 0}])

    def test_type_and_current_advance_status_filters(self):
        data = self.data("?type=advance&status=pendente")
        self.assertEqual(data["summary"]["purchase_count"], 0)
        self.assertEqual(data["summary"]["advance_value"], 1000)
        self.assertEqual(data["pagination"]["total"], 1)
        data = self.data("?status=finalizado")
        self.assertEqual(data["summary"]["purchase_count"], 3)
        self.assertEqual(data["summary"]["advance_value"], 500)
        self.assertEqual(self.data("?type=purchase")["summary"]["advance_count"], 0)

    def test_invalid_filters_are_client_errors(self):
        for query in ("?start=oops", "?end=2026-02-30", "?start=2026-11-05&end=2026-11-04",
                      "?type=unknown", "?status=unknown", "?page=0", "?page=abc", "?end=9999-12-31"):
            with self.subTest(query=query):
                self.assertEqual(self.get(query).status_code, 400)

    def test_missing_supplier_is_not_found(self):
        self.assertEqual(self.get(supplier=999).status_code, 404)

    def test_empty_history_has_zero_totals(self):
        data = self.data(supplier=3)
        self.assertEqual(data["movements"], [])
        self.assertEqual(data["series"], [])
        self.assertEqual(data["summary"]["purchase_value"], 0)
        self.assertEqual(data["pagination"], {"page": 1, "per_page": 20, "pages": 1, "total": 0})

    def test_pagination_does_not_change_totals_and_clamps_out_of_range(self):
        for id_ in range(10, 31):
            db.session.add(self.purchase(id_, datetime(2026, 11, 6), 1, 3))
        db.session.commit()
        first = self.data()
        second = self.data("?page=2")
        self.assertEqual(len(first["movements"]), 20)
        self.assertEqual(len(second["movements"]), 6)
        self.assertEqual(first["summary"], second["summary"])
        self.assertEqual(self.data("?page=999")["pagination"]["page"], 2)

    def test_movement_contains_details_without_exposing_credentials(self):
        data = self.data("?type=purchase&start=2026-11-04&end=2026-11-04")
        purchase = data["movements"][1]
        self.assertEqual(purchase["employee_name"], "Funcionário Teste")
        self.assertEqual(purchase["material_name"], "Ferro")
        self.assertEqual(purchase["advance_abatement_value"], 100)
        self.assertTrue(purchase["datetime"].endswith("-03:00"))
        self.assertNotIn("password_hash", str(data))

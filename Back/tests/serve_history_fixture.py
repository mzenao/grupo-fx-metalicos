"""Disposable browser-test backend. Never connects to the application's database."""
from test_supplier_history import SupplierHistoryTests
from pathlib import Path
from app.extensions import db
from app.models import PurchaseAttachment, Supplier

if __name__ == "__main__":
    fixture = SupplierHistoryTests()
    fixture.setUp()
    receipt = Path(fixture.uploads.name) / "comprovante-teste.txt"
    receipt.write_text("Comprovante de teste - documento ficticio.")
    db.session.add(PurchaseAttachment(id=1, purchase_id=1, file_name=receipt.name, file_path=str(receipt), file_type="text/plain"))
    supplier = db.session.get(Supplier, 2)
    supplier.name = "Fornecedor 2 Comércio e Recuperação de Materiais Metálicos e Recicláveis"
    supplier.user.email = "contato.comercial.fornecedor.com.nome.extenso@example.test"
    db.session.commit()
    try:
        # SQLite's single in-memory connection is shared by every request.
        fixture.app.run(host="127.0.0.1", port=5001, debug=False, use_reloader=False, threaded=False)
    finally:
        fixture.tearDown()

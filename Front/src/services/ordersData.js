import { apiRequest } from "@/services/apiClient";
import { fetchEmployees, fetchSuppliers } from "@/services/entityData";

function mapMaterialType(item) {
  return {
    id: item.id,
    label: item.label,
  };
}

function mapPurchaseFromApi(item, refs) {
  const supplier = refs.suppliersById.get(item.supplier_id);
  const employee = refs.employeesById.get(item.employee_id);
  const material = refs.materialsById.get(item.material_type_id);

  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  return {
    id: item.id,
    SupplierId: item.supplier_id,
    SupplierCode: item.supplier_code ?? supplier?.supplierCode ?? null,
    SupplierName:
      supplier?.personType === "PF"
        ? supplier?.name
        : supplier?.companyName || `Fornecedor #${item.supplier_id}`,
    employeeId: item.employee_id,
    employeeName: employee?.name || `Funcionario #${item.employee_id}`,
    materialTypeId: item.material_type_id,
    materialTypeName: material?.label || "",
    weight: String(item.weight ?? ""),
    valuePerKg: String(item.value_per_kg ?? ""),
    value: String(item.value ?? ""),
    datetime: item.purchase_datetime,
    attachmentNames: attachments.map((attachment) => attachment.file_name).filter(Boolean),
    attachments,
  };
}

export async function fetchMaterialTypes() {
  const payload = await apiRequest("material-types", { method: "GET" });
  return (payload?.data || []).map(mapMaterialType);
}

export async function fetchPurchases() {
  const [purchasesPayload, materialsPayload, suppliersResult, employeesResult] = await Promise.all([
    apiRequest("purchases", { method: "GET" }),
    apiRequest("material-types", { method: "GET" }),
    fetchSuppliers().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
    fetchEmployees().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
  ]);

  const suppliers = suppliersResult.ok ? suppliersResult.data : [];
  const employees = employeesResult.ok ? employeesResult.data : [];
  const materials = (materialsPayload?.data || []).map(mapMaterialType);

  const refs = {
    suppliersById: new Map(suppliers.map((s) => [s.id, s])),
    employeesById: new Map(employees.map((e) => [e.id, e])),
    materialsById: new Map(materials.map((m) => [m.id, m])),
  };

  const purchases = (purchasesPayload?.data || []).map((item) =>
    mapPurchaseFromApi(item, refs)
  );
  return purchases;
}

export async function createPurchase(payload) {
  const response = await apiRequest("purchases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response?.data;
}

export async function createPurchaseWithAttachments({ purchasePayload, files }) {
  const formData = new FormData();
  formData.append("supplier_id", String(purchasePayload.supplier_id));
  formData.append("employee_id", String(purchasePayload.employee_id));
  formData.append("material_type_id", String(purchasePayload.material_type_id));
  formData.append("weight", String(purchasePayload.weight));
  formData.append("value", String(purchasePayload.value));
  formData.append("purchase_datetime", String(purchasePayload.purchase_datetime));

  for (const file of files || []) {
    formData.append("files", file);
  }

  const response = await apiRequest("purchases/with-attachments", {
    method: "POST",
    body: formData,
  });
  return response?.data;
}

export async function updatePurchase(purchaseId, payload) {
  const response = await apiRequest(`purchases/${purchaseId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response?.data;
}

export async function deletePurchase(purchaseId) {
  await apiRequest(`purchases/${purchaseId}`, {
    method: "DELETE",
  });
}

export async function sendPurchaseComprovantes(purchaseId) {
  const response = await apiRequest(`purchases/${purchaseId}/send-comprovantes`, {
    method: "POST",
  });
  return response?.data;
}

export async function uploadAttachment({ purchaseId, file, attachmentType }) {
  const formData = new FormData();
  formData.append("purchase_id", String(purchaseId));
  formData.append("file", file);
  if (attachmentType) {
    formData.append("attachment_type", attachmentType);
  }

  const response = await apiRequest("attachments/upload", {
    method: "POST",
    body: formData,
  });
  return response?.data;
}

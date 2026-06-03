import { apiRequest, buildApiUrl, getAuthToken } from "@/services/apiClient";
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
  const extraMaterials = Array.isArray(item.material_types_extra)
    ? item.material_types_extra.map((name) => String(name || "").trim()).filter(Boolean)
    : [];

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
    materialsExtra: extraMaterials,
    advanceId: item.advance_id ?? null,
    advanceAbatementValue: String(item.advance_abatement_value ?? "0"),
    advanceRemainingAfter: String(item.advance_remaining_after ?? "0"),
    advanceCreditAfter: String(item.advance_credit_after ?? "0"),
    weight: String(item.weight ?? ""),
    valuePerKg: String(item.value_per_kg ?? ""),
    value: String(item.value ?? ""),
    impurityPercentage: String(item.impurity_percentage ?? "0"),
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
  formData.append("material_types_extra", JSON.stringify(purchasePayload.material_types_extra || []));
  formData.append("impurity_percentage", String(purchasePayload.impurity_percentage || 0));
  formData.append("weight", String(purchasePayload.weight));
  formData.append("value", String(purchasePayload.value));
  formData.append("purchase_datetime", String(purchasePayload.purchase_datetime));
  if (purchasePayload.apply_advance) {
    formData.append("apply_advance", "true");
  }

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

export async function deletePurchase(purchaseId, currentPassword) {
  await apiRequest(`purchases/${purchaseId}`, {
    method: "DELETE",
    body: JSON.stringify({ current_password: currentPassword }),
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

export async function resolvePurchaseAttachmentPreviewUrl(attachment) {
  const directUrl = attachment?.file_url || attachment?.file_path || "";
  if (/^https?:\/\//i.test(directUrl)) {
    return directUrl;
  }

  const attachmentId = attachment?.id;
  if (!attachmentId) {
    return directUrl;
  }

  const payload = await apiRequest(`attachments/${attachmentId}/resolved-url`, {
    method: "GET",
  });

  const resolvedUrl = payload?.data?.url || "";
  if (!resolvedUrl) {
    if (directUrl) return directUrl;
    throw new Error("Nao foi possivel obter o link do comprovante.");
  }

  if (!/^https?:\/\//i.test(resolvedUrl)) {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(buildApiUrl(`attachments/${attachmentId}/file`), {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      throw new Error("Nao foi possivel obter o link do comprovante.");
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  return resolvedUrl;
}

import { apiRequest } from "@/services/apiClient";
import { fetchEmployees, fetchSuppliers } from "@/services/entityData";

function mapAdvanceFromApi(item, refs) {
  const supplier = refs.suppliersById.get(item.supplier_id);
  const employee = refs.employeesById.get(item.employee_id);
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
    valueTotal: String(item.value_total ?? ""),
    valueRemaining: String(item.value_remaining ?? ""),
    advanceDatetime: item.advance_datetime,
    status: item.status || "pendente",
    attachmentNames: attachments.map((attachment) => attachment.file_name).filter(Boolean),
    attachments,
  };
}

async function buildRefs() {
  const [suppliersResult, employeesResult] = await Promise.all([
    fetchSuppliers().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
    fetchEmployees().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
  ]);

  return {
    suppliers: suppliersResult.ok ? suppliersResult.data : [],
    employees: employeesResult.ok ? employeesResult.data : [],
  };
}

export async function fetchAdvances() {
  const [advancesPayload, refsResult] = await Promise.all([
    apiRequest("adiantamentos", { method: "GET" }),
    buildRefs(),
  ]);

  const refs = {
    suppliersById: new Map(refsResult.suppliers.map((supplier) => [supplier.id, supplier])),
    employeesById: new Map(refsResult.employees.map((employee) => [employee.id, employee])),
  };

  return (advancesPayload?.data || []).map((item) => mapAdvanceFromApi(item, refs));
}

export async function fetchPendingAdvancesForSupplier(supplierId) {
  const payload = await apiRequest(`adiantamentos/pending?supplier_id=${encodeURIComponent(String(supplierId))}`, {
    method: "GET",
  });
  return payload?.data || [];
}

export async function createAdvanceWithAttachments({ advancePayload, files }) {
  const formData = new FormData();
  formData.append("supplier_id", String(advancePayload.supplier_id));
  formData.append("employee_id", String(advancePayload.employee_id));
  formData.append("value_total", String(advancePayload.value_total));
  formData.append("advance_datetime", String(advancePayload.advance_datetime));

  for (const file of files || []) {
    formData.append("files", file);
  }

  const response = await apiRequest("adiantamentos/with-attachments", {
    method: "POST",
    body: formData,
  });
  return response?.data;
}

export async function sendAdvanceComprovantes(advanceId) {
  if (!advanceId) {
    throw new Error("advanceId is required");
  }

  const payload = await apiRequest(`adiantamentos/${advanceId}/send-comprovantes`, {
    method: "POST",
  });

  return payload?.data || {};
}

export async function deleteAdvance(advanceId, currentPassword) {
  if (!advanceId) {
    throw new Error("advanceId is required");
  }

  await apiRequest(`adiantamentos/${advanceId}`, {
    method: "DELETE",
    body: JSON.stringify({ current_password: currentPassword }),
  });
}

export async function updateAdvance(advanceId, payload) {
  if (!advanceId) {
    throw new Error("advanceId is required");
  }

  const response = await apiRequest(`adiantamentos/${advanceId}`, {
    method: "PUT",
    body: JSON.stringify(payload || {}),
  });

  return response?.data;
}

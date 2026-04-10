import { apiRequest } from "@/services/apiClient";

let employeesCache = [];
let suppliersCache = [];

function mapEmployeeFromApi(item) {
  return {
    id: item.id,
    userId: item.user_id,
    name: item.name || "",
    phone: item.phone || "",
    email: item.email || "",
    ocupance: item.occupation || "",
  };
}

function mapSupplierFromApi(item) {
  const defaultPixType = item.is_pf ? "cpf" : "cnpj";
  const pixKeyType = (item.pix_key_type || defaultPixType || "").toLowerCase();

  return {
    id: item.id,
    userId: item.user_id,
    supplierCode: item.supplier_code,
    personType: item.is_pf ? "PF" : "PJ",
    name: item.name || "",
    companyName: item.company_name || "",
    cpf: item.cpf || "",
    cnpj: item.cnpj || "",
    vehiclePlate: item.vehicle_plate || "",
    referenceAddress: item.reference_address || "",
    email: item.email || "",
    phone: item.phone || "",
    pixKeyType,
  };
}

function mapEmployeeToApi(payload) {
  return {
    name: payload.name,
    phone: payload.phone,
    occupation: payload.ocupance,
    email: payload.email,
    ...(payload.password ? { password: payload.password } : {}),
  };
}

function mapSupplierToApi(payload) {
  const isPf = payload.personType === "PF";
  const allowedPixTypes = isPf ? ["cpf", "phone", "email"] : ["cnpj", "phone", "email"];
  const normalizedPixType = (payload.pixKeyType || "").toLowerCase();
  const pixKeyType = allowedPixTypes.includes(normalizedPixType)
    ? normalizedPixType
    : isPf
      ? "cpf"
      : "cnpj";

  return {
    is_pf: isPf,
    name: isPf ? payload.name : payload.companyName,
    company_name: isPf ? null : payload.companyName,
    cpf: isPf ? payload.cpf : null,
    cnpj: isPf ? null : payload.cnpj,
    vehicle_plate: payload.vehiclePlate,
    reference_address: payload.referenceAddress,
    email: payload.email,
    phone: payload.phone,
    pix_key_type: pixKeyType,
    ...(payload.password ? { password: payload.password } : {}),
  };
}

export function getStoredEmployees() {
  return [...employeesCache];
}

export function getStoredSuppliers() {
  return [...suppliersCache];
}

export function saveEmployees(employees) {
  employeesCache = Array.isArray(employees) ? [...employees] : [];
}

export function saveSuppliers(suppliers) {
  suppliersCache = Array.isArray(suppliers) ? [...suppliers] : [];
}

export async function fetchEmployees() {
  const payload = await apiRequest("employees", { method: "GET" });
  const employees = (payload?.data || []).map(mapEmployeeFromApi);
  saveEmployees(employees);
  return employees;
}

export async function createEmployee(payload) {
  const response = await apiRequest("employees", {
    method: "POST",
    body: JSON.stringify(mapEmployeeToApi(payload)),
  });
  return mapEmployeeFromApi(response.data);
}

export async function updateEmployee(employeeId, payload) {
  const response = await apiRequest(`employees/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(mapEmployeeToApi(payload)),
  });
  return mapEmployeeFromApi(response.data);
}

export async function deleteEmployee(employeeId) {
  await apiRequest(`employees/${employeeId}`, { method: "DELETE" });
}

export async function fetchSuppliers() {
  const payload = await apiRequest("suppliers", { method: "GET" });
  const suppliers = (payload?.data || []).map(mapSupplierFromApi);
  saveSuppliers(suppliers);
  return suppliers;
}

export async function createSupplier(payload) {
  const response = await apiRequest("suppliers", {
    method: "POST",
    body: JSON.stringify(mapSupplierToApi(payload)),
  });
  return mapSupplierFromApi(response.data);
}

export async function updateSupplier(supplierId, payload) {
  const response = await apiRequest(`suppliers/${supplierId}`, {
    method: "PUT",
    body: JSON.stringify(mapSupplierToApi(payload)),
  });
  return mapSupplierFromApi(response.data);
}

export async function deleteSupplier(supplierId) {
  await apiRequest(`suppliers/${supplierId}`, { method: "DELETE" });
}

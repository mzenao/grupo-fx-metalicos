import {
  MOCK_EMPLOYEES_DETAILED,
  MOCK_SUPPLIERS_DETAILED,
  STORAGE_KEYS,
  readStorageArray,
  writeStorageArray,
} from "@/services/mockDatabase";

function mergeById(records, defaults) {
  const safeRecords = Array.isArray(records) ? records : [];
  const safeDefaults = Array.isArray(defaults) ? defaults : [];

  const existingIds = new Set(safeRecords.map((item) => item?.id));
  const missingDefaults = safeDefaults.filter((item) => !existingIds.has(item?.id));

  return [...safeRecords, ...missingDefaults];
}

function normalizeSupplierCodes(suppliers) {
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  let nextCode =
    safeSuppliers.reduce((max, supplier) => {
      const code = Number(supplier?.supplierCode);
      if (!Number.isFinite(code) || code < 200) return max;
      return Math.max(max, code);
    }, 199) + 1;

  return safeSuppliers.map((supplier) => {
    const code = Number(supplier?.supplierCode);
    if (Number.isFinite(code) && code >= 200) return supplier;

    const normalized = { ...supplier, supplierCode: nextCode };
    nextCode += 1;
    return normalized;
  });
}

export function getStoredEmployees() {
  const stored = readStorageArray(STORAGE_KEYS.employees, MOCK_EMPLOYEES_DETAILED);
  return mergeById(stored, MOCK_EMPLOYEES_DETAILED);
}

export function saveEmployees(employees) {
  writeStorageArray(STORAGE_KEYS.employees, employees);
}

export function getStoredSuppliers() {
  const stored = readStorageArray(STORAGE_KEYS.suppliers, MOCK_SUPPLIERS_DETAILED);
  const merged = mergeById(stored, MOCK_SUPPLIERS_DETAILED);
  return normalizeSupplierCodes(merged);
}

export function saveSuppliers(suppliers) {
  writeStorageArray(STORAGE_KEYS.suppliers, suppliers);
}

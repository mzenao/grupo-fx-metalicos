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

export function getStoredEmployees() {
  const stored = readStorageArray(STORAGE_KEYS.employees, MOCK_EMPLOYEES_DETAILED);
  return mergeById(stored, MOCK_EMPLOYEES_DETAILED);
}

export function saveEmployees(employees) {
  writeStorageArray(STORAGE_KEYS.employees, employees);
}

export function getStoredSuppliers() {
  const stored = readStorageArray(STORAGE_KEYS.suppliers, MOCK_SUPPLIERS_DETAILED);
  return mergeById(stored, MOCK_SUPPLIERS_DETAILED);
}

export function saveSuppliers(suppliers) {
  writeStorageArray(STORAGE_KEYS.suppliers, suppliers);
}

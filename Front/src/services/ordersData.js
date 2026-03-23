import {
  MOCK_SUPPLIERS,
  MOCK_EMPLOYEES,
  MOCK_PURCHASES,
  STORAGE_KEYS,
  readStorageArray,
  writeStorageArray,
} from "@/services/mockDatabase";

export const Suppliers = MOCK_SUPPLIERS;

export const EMPLOYEES = MOCK_EMPLOYEES;

export const INITIAL_PURCHASES = MOCK_PURCHASES;

export function getStoredPurchases() {
  return readStorageArray(STORAGE_KEYS.purchases, INITIAL_PURCHASES);
}

export function savePurchases(purchases) {
  writeStorageArray(STORAGE_KEYS.purchases, purchases);
}

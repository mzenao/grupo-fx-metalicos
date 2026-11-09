import { apiRequest } from "@/services/apiClient";

export async function fetchSupplierHistory(supplierId, query, signal) {
  const payload = await apiRequest(`suppliers/${encodeURIComponent(supplierId)}/history?${query}`, {
    method: "GET", signal,
  });
  return payload.data;
}

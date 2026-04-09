const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://backend-production-91dc.up.railway.app/api";

const TOKEN_STORAGE_KEY = "fx_auth_token";

function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return;
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // no-op
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const rawMessage =
      payload?.errors?.detail ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    const message = rawMessage === "Validation error" ? "Erro de Validação" : rawMessage;
    throw new Error(message);
  }

  return payload;
}

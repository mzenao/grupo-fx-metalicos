const DEFAULT_PROD_API_BASE_URL = "https://backend-production-b2bd.up.railway.app/api";
const rawEnvApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const isLocalAddress = /localhost|127\.0\.0\.1/.test(rawEnvApiBaseUrl);

const API_BASE_URL = (() => {
  let url = rawEnvApiBaseUrl && !(import.meta.env.PROD && isLocalAddress)
    ? rawEnvApiBaseUrl
    : import.meta.env.DEV
      ? "http://127.0.0.1:5000/api"
      : DEFAULT_PROD_API_BASE_URL;
  
  // Normalize URL: remove trailing slashes and ensure /api is present in production
  url = url.replace(/\/$/, '');
  
  // In production, ensure /api suffix if not already present
  if (import.meta.env.PROD && !url.endsWith('/api')) {
    // Remove any /api that might be in the middle and re-add it at the end
    url = url.replace(/\/api\/?$/, ''); // Remove existing /api
    url = url + '/api';
  }
  
  return url;
})();

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

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${cleanPath}`, {
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

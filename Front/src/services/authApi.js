import { apiRequest, clearAuthToken, setAuthToken } from "@/services/apiClient";

const USER_STORAGE_KEY = "fx_auth_user";

export function getSessionUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSessionUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return;
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // no-op
  }
}

export function getSessionSnapshot() {
  const user = getSessionUser();
  const role = user?.role || null;
  const supplier = user?.supplier || null;
  const isPf = supplier?.is_pf ?? user?.is_pf;

  return {
    isLoggedIn: !!user,
    role,
    accountType: role === "supplier" ? (isPf ? "pf" : "pj") : "pf",
    currentSupplierId: user?.supplier_id || supplier?.id || null,
    currentUserId: user?.id || null,
    currentUserName: user?.name || user?.email || "",
    currentUserEmail: user?.email || "",
  };
}

export async function login(email, password, rememberMe = false) {
  const payload = await apiRequest("auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember_me: !!rememberMe }),
  });

  const token = payload?.data?.token;
  const user = payload?.data?.user;

  if (!token || !user) {
    throw new Error("Invalid login response from server");
  }

  setAuthToken(token);
  saveSessionUser(user);
  return user;
}

export async function requestPasswordReset(email) {
  return apiRequest("auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email, app_url: window.location.origin }),
  });
}

export async function resetPassword(token, password) {
  return apiRequest("auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function logout() {
  try {
    await apiRequest("auth/logout", { method: "POST" });
  } finally {
    clearAuthToken();
    saveSessionUser(null);
  }
}

export async function fetchMe() {
  const payload = await apiRequest("auth/me", { method: "GET" });
  const user = payload?.data;
  if (user) saveSessionUser(user);
  return user;
}

export async function updateMyAccount(payload) {
  const response = await apiRequest("auth/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  const user = response?.data;
  if (user) saveSessionUser(user);
  return user;
}


export async function registerSupplierAccount(payload) {
  const response = await apiRequest("auth/register-supplier", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const token = response?.data?.token;
  const user = response?.data?.user;

  if (!token || !user) {
    throw new Error("Invalid register response from server");
  }

  setAuthToken(token);
  saveSessionUser(user);
  return user;
}

import { getActiveUser } from "@/services/mockDatabase";

// Ajuste manual do usuario ativo em mockDatabase.js (ACTIVE_USER_ID).
const activeUser = getActiveUser();

export const mockSession = {
  isLoggedIn: activeUser !== null,
  role: activeUser?.role || null,
  accountType: activeUser?.accountType || "pf",
  currentSupplierId: activeUser?.supplierId || null,
  currentUserId: activeUser?.id || null,
  currentUserName: activeUser?.name || "",
  currentUserEmail: activeUser?.email || "",
};

import React from "react";

// ── Auth Context — provides isAdmin + canEdit(tabId) to all components ──
export const AuthContext = React.createContext({
  isAdmin: true,
  editableTabs: null,
  canEdit: () => true
});

export const useAuth = () => React.useContext(AuthContext);

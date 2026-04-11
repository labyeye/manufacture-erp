import React from "react";


export const AuthContext = React.createContext({
  isAdmin: true,
  editableTabs: null,
  canEdit: () => true
});

export const useAuth = () => React.useContext(AuthContext);

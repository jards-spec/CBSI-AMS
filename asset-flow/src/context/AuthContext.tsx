import React, { createContext, useContext, useEffect, useState } from 'react';

type Role =
  | 'Admin'
  | 'Superuser'
  | 'Super Admin'
  | 'IT Admin'
  | 'Manager'
  | 'User'
  | string;

interface User {
  id: string;
  name: string;
  email: string;
  employeeNumber: string;
  role: Role;
  department: string;
  avatar?: string;
  phone?: string;
  jobTitle?: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;

  canCreate: () => boolean;
  canEdit: (employeeId?: string) => boolean;
  canDelete: () => boolean;
  canViewAll: () => boolean;

  canAccessAssets: () => boolean;
  canAccessEmployees: () => boolean;
  canAccessComponents: () => boolean;
  canAccessLicenses: () => boolean;
  canAccessAccessories: () => boolean;
  canAccessConsumables: () => boolean;
  canAccessAuditLog: () => boolean;
  canAccessDashboard: () => boolean;
}

const TOKEN_KEY = 'vantage_token';
const USER_KEY = 'vantage_user';
const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: any): User => ({
  id: String(user?.id || ''),
  name: String(user?.name || ''),
  email: String(user?.email || ''),
  employeeNumber: String(user?.employeeNumber || ''),
  role: String(user?.role || 'User'),
  department: String(user?.department || 'Unassigned'),
  avatar: String(user?.avatar || ''),
  phone: String(user?.phone || ''),
  jobTitle: String(user?.jobTitle || ''),
});

const normalizeRole = (role: string = '') => role.trim().toLowerCase();

const isPrivilegedRole = (role: string = '') => {
  const r = normalizeRole(role);
  return ['admin', 'superuser', 'super admin', 'it admin', 'manager'].includes(r);
};

const isAdminRole = (role: string = '') => {
  const r = normalizeRole(role);
  return r === 'admin';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const clearAuthState = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (!token || !storedUser) {
      clearAuthState();
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setCurrentUser(normalizeUser(parsed));
    } catch {
      clearAuthState();
    }
  }, []);

  useEffect(() => {
    const onUnauthorized = () => clearAuthState();

    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY || event.key === USER_KEY) {
        const token = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (!token || !storedUser) {
          setCurrentUser(null);
          return;
        }

        try {
          setCurrentUser(normalizeUser(JSON.parse(storedUser)));
        } catch {
          clearAuthState();
        }
      }
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = (user: User, token?: string) => {
    const normalizedUser = normalizeUser(user);
    setCurrentUser(normalizedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  };

  const logout = () => {
    clearAuthState();
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;

      const nextUser = normalizeUser({
        ...prev,
        ...updates,
      });

      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return nextUser;
    });
  };

  // ==============================
  // PERMISSIONS
  // ==============================

  const canCreate = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canEdit = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canDelete = (): boolean => {
    if (!currentUser) return false;
    return isAdminRole(currentUser.role);
  };

  const canViewAll = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canAccessDashboard = (): boolean => {
    return true;
  };

  // ✅ Inventory restricted to privileged roles
  const canAccessAssets = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canAccessComponents = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canAccessLicenses = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canAccessAccessories = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canAccessConsumables = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canAccessEmployees = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  const canAccessAuditLog = (): boolean => {
    if (!currentUser) return false;
    return isPrivilegedRole(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        updateCurrentUser,
        canCreate,
        canEdit,
        canDelete,
        canViewAll,
        canAccessAssets,
        canAccessEmployees,
        canAccessComponents,
        canAccessLicenses,
        canAccessAccessories,
        canAccessConsumables,
        canAccessAuditLog,
        canAccessDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
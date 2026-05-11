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
  updateActivityTime: () => void;
  getTimeRemaining: () => number;

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
const SESSION_START_KEY = 'session_start_time';
const LAST_ACTIVITY_KEY = 'last_activity_time';
const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

// Session timeout configuration (8 hours in milliseconds)
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

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

// Session management functions
const getSessionStartTime = (): string | null => {
  return localStorage.getItem(SESSION_START_KEY);
};

const setSessionStartTime = (): void => {
  localStorage.setItem(SESSION_START_KEY, Date.now().toString());
};

const getLastActivityTime = (): string | null => {
  return localStorage.getItem(LAST_ACTIVITY_KEY);
};

const setLastActivityTime = (): void => {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

const checkSessionTimeout = (): boolean => {
  const lastActivity = getLastActivityTime();
  if (!lastActivity) return false;
  
  const elapsed = Date.now() - parseInt(lastActivity);
  return elapsed > SESSION_TIMEOUT;
};

const getTimeRemaining = (): number => {
  const lastActivity = getLastActivityTime();
  if (!lastActivity) return SESSION_TIMEOUT;
  
  const elapsed = Date.now() - parseInt(lastActivity);
  return Math.max(0, SESSION_TIMEOUT - elapsed);
};

const updateActivityTime = (): void => {
  setLastActivityTime();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const clearAuthState = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
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
      
      // Check if session has expired
      if (checkSessionTimeout()) {
        clearAuthState();
        window.location.assign('/login');
        return;
      }
      
      setCurrentUser(normalizeUser(parsed));
      
      // Initialize activity time if not set
      if (!getLastActivityTime()) {
        setSessionStartTime();
        setLastActivityTime();
      }
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

  // Track user activity and check session timeout
  useEffect(() => {
    if (!currentUser) return;

    // Initialize session on first load
    if (!getLastActivityTime()) {
      setSessionStartTime();
      setLastActivityTime();
    }

    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    const handleActivity = () => {
      updateActivityTime();
    };

    activities.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Check timeout every minute
    const interval = setInterval(() => {
      if (checkSessionTimeout()) {
        clearAuthState();
        window.location.assign('/login');
      }
    }, 60000);

    return () => {
      activities.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser]);

  const login = (user: User, token?: string) => {
    const normalizedUser = normalizeUser(user);
    setCurrentUser(normalizedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    
    // Initialize session timeout on login
    setSessionStartTime();
    setLastActivityTime();
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
        updateActivityTime,
        getTimeRemaining,
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
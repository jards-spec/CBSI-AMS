import React, { createContext, useContext, useState, useEffect } from 'react';

export type LogType = 'ADDED' | 'UPDATED' | 'DELETED' | 'CHECKOUT' | 'CHECKIN' | 'INFO';

export interface AuditLog {
  id: string;
  timestamp: string;
  type: LogType;
  entity: string;
  message: string;
  user: string;
}

interface AuditContextType {
  logs: AuditLog[];
  addLog: (type: LogType, entity: string, message: string) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('ams_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ams_audit_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = (type: LogType, entity: string, message: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      type,
      entity,
      message,
      user: 'ADMIN',
    };
    setLogs(prev => [newLog, ...prev]);
  };

  return (
    <AuditContext.Provider value={{ logs, addLog }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
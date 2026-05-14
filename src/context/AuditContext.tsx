import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

export type LogType =
  | 'ADDED'
  | 'UPDATED'
  | 'DELETED'
  | 'CHECKOUT'
  | 'CHECKIN'
  | 'INFO'
  | 'ISSUE'
  | 'REQUESTED'
  | 'REGISTERED'
  | 'CLONED'
  | 'ARCHIVED'
  | 'RESTORED'
  | string;

export interface AuditLog {
  id: string;
  timestamp: string;
  type: LogType;
  entity: string;
  message: string;
  user: string;
  action?: string;
  target?: string;
  details?: string;
}

export interface AuditContextType {
  logs: AuditLog[];
  addLog: (type: LogType, entity: string, message: string, details?: string) => void;
  clearLogs: () => void;
  refreshLogs: () => Promise<void>;
}

// ✅ ADD 'export' HERE (line 38)
export const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const refreshLogs = useCallback(async () => {
    try {
      const data = await api.audit.list();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }, []);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  const addLog = useCallback(
    (type: LogType, entity: string, message: string, details?: string) => {
      const optimisticLog: AuditLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleString(),
        type,
        entity,
        message,
        user: 'SYSTEM',
        action: type,
        target: entity,
        details: details ?? message,
      };

      setLogs((prev) => [optimisticLog, ...prev]);

      api.audit
        .add({
          type,
          entity,
          message,
          details: details ?? message,
          user: 'SYSTEM',
        })
        .then((savedLog) => {
          if (!savedLog || !savedLog.id) return;
          setLogs((prev) => prev.map((log) => (log.id === optimisticLog.id ? { ...optimisticLog, ...savedLog } : log)));
        })
        .catch((error) => {
          console.error('Failed to write audit log:', error);
        });
    },
    [],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    api.audit.clear().catch((error) => {
      console.error('Failed to clear audit logs:', error);
    });
  }, []);

  return (
    <AuditContext.Provider value={{ logs, addLog, clearLogs, refreshLogs }}>
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
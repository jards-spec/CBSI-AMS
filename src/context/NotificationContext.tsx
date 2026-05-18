import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  isRead: number;
  status?: 'PENDING' | 'CONFIRMED' | 'DECLINED' | string;
  confirmedAt?: string | null;
  confirmedById?: string | null;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  confirmNotification: (notificationId: string) => Promise<void>;
  declineNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const rows = await api.notifications.me(false);
      setNotifications(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!currentUser) return;

    const timer = window.setInterval(() => {
      void refresh();
    }, 25000);

    return () => window.clearInterval(timer);
  }, [currentUser, refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => Number(n.isRead || 0) === 0).length,
    [notifications],
  );

  const markRead = async (notificationId: string) => {
    try {
      await api.notifications.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: 1 } : n)),
      );
    } catch (error) {
      console.warn((error as Error).message || 'Failed to mark notification as read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
    } catch (error) {
      console.warn((error as Error).message || 'Failed to mark all notifications as read');
    }
  };

  const confirmNotification = async (notificationId: string) => {
    try {
      await api.notifications.confirm(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                isRead: 1,
                status: 'CONFIRMED',
                confirmedAt: new Date().toISOString(),
              }
            : n,
        ),
      );
      await refresh();
    } catch (error) {
      console.warn((error as Error).message || 'Failed to confirm notification');
    }
  };

  const declineNotification = async (notificationId: string) => {
    try {
      await api.notifications.decline(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                isRead: 1,
                status: 'DECLINED',
              }
            : n,
        ),
      );
      await refresh();
    } catch (error) {
      console.warn((error as Error).message || 'Failed to decline notification');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh,
        markRead,
        markAllRead,
        confirmNotification,
        declineNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

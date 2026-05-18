import React, { useEffect, useState } from 'react';
import { Bell, Package, XCircle, CheckCircle2, Ban } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
  const { currentUser } = useAuth();
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    confirmNotification,
    declineNotification,
    loading,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  if (!currentUser) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-600 transition-all hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-[240] bg-black/45 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <aside
            className="fixed right-0 top-0 z-[250] h-screen w-full max-w-[460px] border-l border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f121d]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-[#0f121d]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-red-600/20 bg-red-600/10 p-2">
                    <Bell className="text-red-600" size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Notification Center
                    </h2>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {unreadCount} Unread
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void markAllRead()}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Read All
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg bg-slate-200 p-2 text-slate-900 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:text-white"
                    title="Close"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[calc(100vh-88px)] space-y-3 overflow-y-auto p-4">
              {loading ? (
                <div className="py-16 text-center text-sm font-black uppercase tracking-widest text-slate-500">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="mx-auto mb-4 text-slate-400 dark:text-slate-600" size={42} />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                    No Notifications
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const status = String(notification.status || 'PENDING').toUpperCase();
                  const isUnread = Number(notification.isRead || 0) === 0;
                  const isActionable =
                    (notification.type === 'ASSET_ASSIGNMENT' || notification.type === 'LICENSE_ASSIGNMENT') &&
                    status === 'PENDING';

                  return (
                    <div
                      key={notification.id}
                      className="rounded-2xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0a0c14]"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {notification.title}
                          </h3>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                            {notification.type}
                          </p>
                        </div>

                        <span
                          className={`rounded-md px-2 py-1 text-[9px] font-black uppercase ${
                            status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : status === 'DECLINED'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : isUnread
                                  ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500'
                                  : 'bg-slate-300/50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {status === 'PENDING' ? (isUnread ? 'Unread' : 'Read') : status}
                        </span>
                      </div>

                      <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {notification.message}
                      </p>

                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>

                      <div className="mt-3 flex gap-2 border-t border-slate-300 pt-3 dark:border-slate-800">
                        {isActionable ? (
                          <>
                            <button
                              onClick={() => void confirmNotification(notification.id)}
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={12} />
                              Confirm Receipt
                            </button>
                            <button
                              onClick={() => void declineNotification(notification.id)}
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-800 hover:bg-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              <Ban size={12} />
                              Decline
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => void markRead(notification.id)}
                            disabled={!isUnread}
                            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isUnread ? 'Mark as Read' : 'Already Read'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
};

export default NotificationBell;

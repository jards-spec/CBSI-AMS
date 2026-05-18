import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Toast = {
  id: number;
  message: string;
  kind?: 'info' | 'error' | 'success';
};

type ToastContextType = {
  push: (message: string, kind?: Toast['kind']) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (message: string, kind: Toast['kind'] = 'error') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
      push(text || 'Something happened', 'error');
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const value = useMemo(() => ({ push }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              'pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ' +
              (t.kind === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : t.kind === 'info'
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-red-300 bg-red-50 text-red-800')
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}


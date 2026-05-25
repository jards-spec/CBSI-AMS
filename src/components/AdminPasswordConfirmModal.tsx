import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}

const AdminPasswordConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  danger = false,
  onCancel,
  onConfirm,
}) => {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) setPassword('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedPassword = password.trim();
    if (!trimmedPassword) return;
    onConfirm(trimmedPassword);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#0f121d] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800/70 bg-[#161b29]/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-red-600/20 bg-red-600/10 p-2 text-red-500">
              <Lock size={18} />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-500 transition hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <p className="text-sm font-semibold text-slate-300">{message}</p>

          <label className="block space-y-2">
            <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Current Admin Password
            </span>
            <input
              autoFocus
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#05070a] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-700 focus:border-red-600"
              placeholder="Enter your password"
            />
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-800 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim()}
              className={`flex-1 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                danger ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminPasswordConfirmModal;

import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const tokenFromUrl = useMemo(() => params.get('token') || '', [params]);

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setErrorMessage('');

    if (!token.trim()) {
      setErrorMessage('Reset token is required.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.resetPassword({
        token: token.trim(),
        password,
      });

      setMessage(result.message || 'Password has been reset successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-[#0f121d] p-8">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Reset <span className="text-red-600">Password</span>
        </h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Reset Token
            </span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-3 text-sm text-white outline-none focus:border-red-600"
              placeholder="Paste token from email link"
            />
          </label>

          <div>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
              New Password
            </span>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-3 pr-12 text-sm text-white outline-none focus:border-red-600"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
              Confirm Password
            </span>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-3 pr-12 text-sm text-white outline-none focus:border-red-600"
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-red-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound size={16} />
              {loading ? 'Resetting...' : 'Reset Password'}
            </span>
          </button>
        </form>

        <Link
          to="/login"
          className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white"
        >
          <ArrowLeft size={14} />
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
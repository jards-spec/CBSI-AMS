import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Hash, Send, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeNumber = employeeNumber.trim().toUpperCase();

    if (!normalizedEmail || !normalizedEmployeeNumber) {
      setLoading(false);
      setErrorMessage('Email and Employee Number are required.');
      return;
    }

    try {
      const result = await api.auth.forgotPassword({
        email: normalizedEmail,
        employeeNumber: normalizedEmployeeNumber,
      });

      setMessage(result.message || 'Password reset link sent. Please check your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-[#0f121d] p-8">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          Forgot <span className="text-red-600">Password</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your Email and Employee Number. We will send a reset link if they match an account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Mail size={12} className="text-red-600" /> Email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-3 text-sm text-white outline-none focus:border-red-600"
              placeholder="you@company.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Hash size={12} className="text-red-600" /> Employee Number
            </span>
            <input
              required
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
              className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-3 text-sm text-white outline-none focus:border-red-600"
              placeholder="CB-10294"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-red-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <Send size={16} />
              {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
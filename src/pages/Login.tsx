import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LogIn,
  Box,
  Hash,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Building2,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type Mode = 'login' | 'register';

const Login = () => {
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(true);

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerDepartment, setRegisterDepartment] = useState('');
  const [registerEmployeeNumber, setRegisterEmployeeNumber] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login page should stay public and must not call protected endpoints before auth.
  useEffect(() => {
    setLoading(false);
  }, []);

  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmployeeNumber = employeeNumber.trim().toUpperCase();
    const normalizedPassword = password;

    if (!normalizedEmployeeNumber || !normalizedPassword) {
      setErrorMessage('Employee Number and Password are required.');
      return;
    }

    setAuthenticating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await api.auth.login({
        employeeNumber: normalizedEmployeeNumber,
        password: normalizedPassword,
      });

      if (!result?.user || !result?.token) {
        throw new Error('Invalid login response.');
      }

      // Single source of truth for user + token persistence.
      login(
        {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          employeeNumber: result.user.employeeNumber || '',
          role: result.user.role || 'User',
          department: result.user.department || 'Unassigned',
          avatar: result.user.avatar || '',
          phone: result.user.phone || '',
          jobTitle: result.user.jobTitle || '',
        },
        result.token,
      );
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to sign in.');
    } finally {
      setAuthenticating(false);
    }
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmployeeNumber = registerEmployeeNumber.trim().toUpperCase();
    const normalizedName = registerName.trim();
    const normalizedEmail = registerEmail.trim();
    const normalizedDepartment = registerDepartment.trim() || 'Unassigned';
    const normalizedPassword = registerPassword.trim();
    const normalizedConfirm = registerConfirmPassword.trim();

    if (!normalizedName || !normalizedEmail || !normalizedEmployeeNumber || !normalizedPassword) {
      setErrorMessage('Name, Email, Employee Number, and Password are required.');
      return;
    }

    if (normalizedPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (normalizedPassword !== normalizedConfirm) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setRegistering(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.auth.register({
        name: normalizedName,
        email: normalizedEmail,
        employeeNumber: normalizedEmployeeNumber,
        department: normalizedDepartment,
        password: normalizedPassword,
      });

      setSuccessMessage('Account created successfully. You can now sign in.');
      setMode('login');
      setEmployeeNumber(normalizedEmployeeNumber);
      setPassword('');

      setRegisterName('');
      setRegisterEmail('');
      setRegisterDepartment('');
      setRegisterEmployeeNumber('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to create account.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0c14]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
            Initializing Secure Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0c14] p-4">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* LEFT PANEL */}
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-800 bg-[#0f121d] shadow-[0_0_60px_rgba(0,0,0,0.45)]">
          <div className="border-b border-slate-800/60 bg-[#161b29]/40 px-8 py-8">
            <div className="mb-5 inline-flex items-center gap-3 rounded-3xl border border-red-600/20 bg-red-600/10 p-4">
              <Box className="text-red-600" size={42} />
            </div>

            <h1 className="text-5xl font-black uppercase tracking-tighter text-white">
              <span className="mb-1 block text-3xl">ITAM</span>
              <span className="text-red-600">Vantage</span>
            </h1>

            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
              ASSET MANAGEMENT SYSTEM // SECURE ACCESS PORTAL
            </p>
          </div>

          <div className="space-y-6 px-8 py-8">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white italic">
                Welcome Briefing
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Welcome to <span className="font-bold text-white">ITAM Vantage</span>. This portal is used to manage
                equipment requests, maintenance tickets, and inventory workflows based on your access level.
              </p>
            </div>

            {/* â€œwelcome skitâ€ panel */}
            <div className="rounded-2xl border border-slate-800 bg-[#111624] p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                Quick Guide // Read Me
              </p>

              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <p>
                  <span className="font-black uppercase tracking-widest text-slate-300 text-[10px]">Step 1:</span>{' '}
                  Sign in using your <span className="font-bold text-white">Employee Number</span> and password.
                </p>
                <p>
                  <span className="font-black uppercase tracking-widest text-slate-300 text-[10px]">Step 2:</span>{' '}
                  Submit <span className="font-bold text-white">Requests</span> or <span className="font-bold text-white">Maintenance Tickets</span>.
                </p>
                <p>
                  <span className="font-black uppercase tracking-widest text-slate-300 text-[10px]">Tip:</span>{' '}
                  If you forgot your password, use the reset link on the sign-in panel.
                </p>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  System Notice
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Inventory visibility is role-based. If you donâ€™t see inventory pages, your account may be configured
                  as <span className="font-bold text-white">User</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-800 bg-[#0f121d] shadow-[0_0_60px_rgba(0,0,0,0.45)]">
          <div className="border-b border-slate-800/60 bg-[#161b29]/40 px-8 py-8">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">
              {mode === 'login' ? (
                <>
                  Secure <span className="text-red-600">Sign-In</span>
                </>
              ) : (
                <>
                  Create <span className="text-red-600">Account</span>
                </>
              )}
            </h2>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              {mode === 'login' ? 'Employee Number Authentication' : 'Self Registration (User Access)'}
            </p>
          </div>

          <div className="p-8">
            {mode === 'login' ? (
              <form onSubmit={authenticate} className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Hash size={12} className="text-red-600" /> Employee Number
                  </label>
                  <input
                    required
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
                    className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 text-sm font-black uppercase text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                    placeholder="E.G. CB-10294"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <KeyRound size={12} className="text-red-600" /> Password
                  </label>

                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                      placeholder="Enter your account password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* âœ… Forgot password link */}
                <div className="flex items-center justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {errorMessage ? (
                  <div className="rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-4">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                      <CheckCircle2 size={14} />
                      {successMessage}
                    </p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={authenticating}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-xl shadow-red-950/40 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogIn size={18} />
                  {authenticating ? 'Authorizing...' : 'Access System'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-transparent px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-red-600 hover:text-white"
                >
                  <UserPlus size={16} />
                  Create New Account
                </button>
              </form>
            ) : (
              <form onSubmit={createAccount} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Full Name
                    </label>
                    <input
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 text-sm text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                      placeholder="e.g. Juan Dela Cruz"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Mail size={12} className="text-red-600" /> Email
                    </label>
                    <input
                      required
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 text-sm text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                      placeholder="e.g. yourname@company.com"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Building2 size={12} className="text-red-600" /> Department
                    </label>
                    <input
                      value={registerDepartment}
                      onChange={(e) => setRegisterDepartment(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 text-sm text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                      placeholder="e.g. MIS Department"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Hash size={12} className="text-red-600" /> Employee Number
                    </label>
                    <input
                      required
                      value={registerEmployeeNumber}
                      onChange={(e) => setRegisterEmployeeNumber(e.target.value.toUpperCase())}
                      className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 text-sm font-black uppercase text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                      placeholder="e.g. CB-12031"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                      >
                        {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showRegisterConfirmPassword ? 'text' : 'password'}
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-[#05070a] px-4 py-4 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterConfirmPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                      >
                        {showRegisterConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-4">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                      <CheckCircle2 size={14} />
                      {successMessage}
                    </p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={registering}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-xl shadow-red-950/40 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={18} />
                  {registering ? 'Creating...' : 'Create Account'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-transparent px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-red-600 hover:text-white"
                >
                  <ArrowLeft size={16} />
                  Back To Sign-In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


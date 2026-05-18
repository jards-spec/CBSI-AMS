import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ShieldCheck,
  Wrench,
  History,
  Mouse,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Send,
  Box,
  LogOut,
  Crown,
  Star,
  User as UserIcon,
  Sun,
  Moon,
  BarChart3,
  Building2,
} from 'lucide-react';
import { cn } from './lib/utils';
import { AuditProvider } from './context/AuditContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import NotificationBell from './components/NotificationBell';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { ConfirmProvider } from './context/ConfirmContext';

// âœ… add these imports
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Page Imports
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Employees from './pages/Employees';
import Components from './pages/Components';
import SoftwareLicenses from './pages/SoftwareLicenses';
import Accessories from './pages/Accessories';
import Consumables from './pages/Consumables';
import Maintenance from './pages/Maintenance';
import AuditLog from './pages/AuditLog';
import Requests from './pages/Requests';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';


function AppContent() {
  const {
    currentUser,
    logout,
    canAccessAssets,
    canAccessEmployees,
    canAccessComponents,
    canAccessLicenses,
    canAccessAccessories,
    canAccessConsumables,
    canAccessAuditLog,
  } = useAuth();

  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  // âœ… IMPORTANT: When logged out, use Routes (so /forgot-password works)
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Crown size={14} className="text-red-600 dark:text-red-500" />;
      case 'Superuser':
        return <Star size={14} className="text-yellow-600 dark:text-yellow-500" />;
      case 'User':
        return <UserIcon size={14} className="text-blue-600 dark:text-blue-500" />;
      default:
        return <UserIcon size={14} className="text-slate-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'border-red-600/50 bg-red-600/10 text-red-600 dark:text-red-500';
      case 'Superuser':
        return 'border-yellow-600/50 bg-yellow-600/10 text-yellow-600 dark:text-yellow-500';
      case 'User':
        return 'border-blue-600/50 bg-blue-600/10 text-blue-600 dark:text-blue-500';
      default:
        return 'border-slate-800 bg-slate-900/50 text-slate-600';
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', show: true },
    { id: 'profile', label: 'My Profile', icon: UserIcon, path: '/profile', show: true },
    { id: 'assets', label: 'Asset Inventory', icon: Package, path: '/assets', show: canAccessAssets() },
    { id: 'components', label: 'Components', icon: Box, path: '/components', show: canAccessComponents() },
    { id: 'employees', label: 'Personnel', icon: Users, path: '/employees', show: canAccessEmployees() },
    { id: 'licenses', label: 'Licenses', icon: ShieldCheck, path: '/licenses', show: canAccessLicenses() },
    { id: 'accessories', label: 'Accessories', icon: Mouse, path: '/accessories', show: canAccessAccessories() },
    { id: 'consumables', label: 'Consumables', icon: Droplets, path: '/consumables', show: canAccessConsumables() },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, path: '/maintenance', show: true },
    { id: 'requests', label: 'Requests', icon: Send, path: '/requests', show: true },
    { id: 'audit', label: 'Audit Logs', icon: History, path: '/audit-history', show: canAccessAuditLog() },
    { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports', show: canAccessAuditLog() },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, path: '/suppliers', show: canAccessAssets() },
  ].filter((item) => item.show);

  return (
    <div
      className="flex h-screen overflow-hidden font-sans transition-colors duration-300"
      style={{ background: 'var(--app-shell-bg)', color: 'var(--app-text)' }}
    >
      {/* SIDE NAVIGATION */}
      <aside
        className={cn(
          'z-50 flex flex-col border-r shadow-xl backdrop-blur-xl transition-all duration-300',
          isSidebarOpen ? 'w-64' : 'w-20',
        )}
        style={{ backgroundColor: 'var(--app-panel-bg)', borderColor: 'var(--app-border)' }}
      >
        <div className="flex items-center gap-3 border-b p-6" style={{ borderColor: 'var(--app-border)' }}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 shadow-lg dark:shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <Box className="text-white" size={20} />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
                CentralBooks
              </span>
              <span className="text-sm font-black uppercase leading-none tracking-tighter text-red-600">
                Vantage
              </span>
            </div>
          )}
        </div>

        <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                  isActive
                    ? 'bg-red-600/10 text-red-600 dark:text-red-500'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/3 dark:hover:text-slate-300',
                )}
              >
                <item.icon
                  size={18}
                  className={cn(
                    'transition-colors',
                    isActive
                      ? 'text-red-600 dark:text-red-500'
                      : 'group-hover:text-red-500 dark:group-hover:text-red-400',
                  )}
                />
                {isSidebarOpen && (
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                )}
                {isActive ? (
                  <div className="absolute right-2 h-4 w-1 rounded-full bg-red-600 shadow-lg dark:shadow-[0_0_8px_#dc2626]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className={cn(
            'group mx-3 mb-2 flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
            'border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-800/50 dark:text-slate-500 dark:hover:border-red-600/30 dark:hover:bg-red-600/10 dark:hover:text-red-500',
          )}
          style={{ borderColor: 'var(--app-border)' }}
        >
          <LogOut size={18} className="group-hover:text-red-600 dark:group-hover:text-red-500" />
          {isSidebarOpen && (
            <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
          )}
        </button>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center justify-center border-t p-4 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"
          style={{ borderColor: 'var(--app-border)' }}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* HEADER AREA */}
        <header
          className="z-40 flex h-20 items-center justify-between border-b px-8 backdrop-blur-xl"
          style={{ backgroundColor: 'var(--app-panel-bg)', borderColor: 'var(--app-border)' }}
        >
          <div className="flex items-center gap-4">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600 shadow-lg dark:shadow-[0_0_8px_#dc2626]" />
            <span className="text-[9px] font-black uppercase italic tracking-[0.4em] text-slate-500 dark:text-slate-500">
              System Active //{' '}
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {currentUser.role.toUpperCase()}_ACCESS
              </span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            <NotificationBell />

            <button
              onClick={toggleTheme}
              className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-600 transition-all hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/profile"
              className="flex items-center gap-4 rounded-2xl px-3 py-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-900/70"
            >
              <div className="hidden text-right sm:block">
                <div className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {currentUser.name}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-0.5 ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleIcon(currentUser.role)}
                    <span className="text-[8px] font-black uppercase tracking-wider">{currentUser.role}</span>
                  </div>

                  <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-600">â€¢</span>

                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                    {currentUser.department}
                  </span>

                  {currentUser.employeeNumber ? (
                    <>
                      <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-600">â€¢</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                        {currentUser.employeeNumber}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-200 text-white dark:border-slate-800 dark:bg-slate-900">
                <img
                  src={
                    currentUser.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0f172a&color=38bdf8`
                  }
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </Link>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT */}
        <div
          className="scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 flex-1 overflow-y-auto p-8"
          style={{ backgroundColor: 'var(--app-panel-muted)' }}
        >
          <div className="mx-auto max-w-400">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              {canAccessAssets() && <Route path="/assets" element={<Assets />} />}
              {canAccessComponents() && <Route path="/components" element={<Components />} />}
              {canAccessEmployees() && <Route path="/employees" element={<Employees />} />}
              {canAccessLicenses() && <Route path="/licenses" element={<SoftwareLicenses />} />}
              {canAccessAccessories() && <Route path="/accessories" element={<Accessories />} />}
              {canAccessConsumables() && <Route path="/consumables" element={<Consumables />} />}
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/requests" element={<Requests />} />
              {canAccessAuditLog() && <Route path="/audit-history" element={<AuditLog />} />}
              {canAccessAuditLog() && <Route path="/reports" element={<Reports />} />}
              {canAccessAssets() && <Route path="/suppliers" element={<Suppliers />} />}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>

        {/* SYSTEM STATUS FOOTER */}
        <footer
          className="flex h-6 shrink-0 items-center justify-between border-t px-8"
          style={{ backgroundColor: 'var(--app-panel-bg)', borderColor: 'var(--app-border)' }}
        >
          <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-slate-500 dark:text-slate-600">
            CentralBooks Vantage Asset Management // v4.0.0 // User: {currentUser.name}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
              Secure Link
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ConfirmProvider>
        <AuthProvider>
  <NotificationProvider>
    <AuditProvider>
      <AppContent />
      <SessionTimeoutWarning warningTime={5 * 60 * 1000} />
    </AuditProvider>
  </NotificationProvider>
</AuthProvider>
</ConfirmProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

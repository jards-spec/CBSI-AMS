import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Users, ShieldCheck, 
  Wrench, History, Mouse, Droplets, ChevronLeft, ChevronRight, Send, Box 
} from 'lucide-react';
import { cn } from './lib/utils';
import { AuditProvider } from './context/AuditContext';

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

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  // Navigation configuration synced with your latest requirements
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'assets', label: 'Asset Inventory', icon: Package, path: '/assets' },
    { id: 'components', label: 'Components', icon: Box, path: '/components' },
    { id: 'employees', label: 'Personnel', icon: Users, path: '/employees' },
    { id: 'licenses', label: 'Licenses', icon: ShieldCheck, path: '/licenses' },
    { id: 'accessories', label: 'Accessories', icon: Mouse, path: '/accessories' },
    { id: 'consumables', label: 'Consumables', icon: Droplets, path: '/consumables' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, path: '/maintenance' },
    { id: 'requests', label: 'Requests', icon: Send, path: '/requests' },
    { id: 'audit', label: 'Audit Logs', icon: History, path: '/audit-history' },
  ];

  return (
    <div className="flex h-screen bg-[#05070a] text-slate-300 font-sans overflow-hidden">
      {/* SIDE NAVIGATION */}
      <aside className={cn(
        "bg-[#0a0c14] border-r border-slate-800/50 transition-all duration-300 flex flex-col z-50 shadow-2xl relative",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        {/* LOGO SECTION */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/30">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <Box className="text-white" size={20} />
          </div>
          {isSidebarOpen && (
            <span className="font-black text-white uppercase tracking-tighter text-lg italic">
              Asset<span className="text-red-600">Flow</span>
            </span>
          )}
        </div>

        {/* NAV LINKS */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-red-600/10 text-red-500" 
                    : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
                )}
              >
                <item.icon size={18} className={cn("transition-colors", isActive ? "text-red-500" : "group-hover:text-red-400")} />
                {isSidebarOpen && (
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                )}
                {isActive && <div className="absolute right-2 w-1 h-4 bg-red-600 rounded-full shadow-[0_0_8px_#dc2626]" />}
              </Link>
            );
          })}
        </nav>

        {/* COLLAPSE TOGGLE */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-4 border-t border-slate-800/30 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* HEADER AREA */}
        <header className="h-20 border-b border-slate-800/30 flex items-center justify-between px-8 bg-[#05070a]/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#dc2626]" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 italic">
              System Admin Active // <span className="text-slate-400 font-mono">NODE_01</span>
            </span>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black text-white uppercase tracking-tight">W. Del Rosario</div>
              <div className="text-[8px] font-black text-red-600 uppercase tracking-widest text-right">MIS Head</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black text-xs">
              WD
            </div>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/components" element={<Components />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/licenses" element={<SoftwareLicenses />} />
              <Route path="/accessories" element={<Accessories />} />
              <Route path="/consumables" element={<Consumables />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/audit-history" element={<AuditLog />} />
              
              {/* Fallback for undefined routes */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>

        {/* SYSTEM STATUS FOOTER */}
        <footer className="h-6 bg-[#0a0c14] border-t border-slate-800/30 flex items-center justify-between px-8 shrink-0">
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.3em]">
            Central Books Asset Management // Terminal v3.2.4
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Secure Link</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuditProvider>
        <AppContent />
      </AuditProvider>
    </BrowserRouter>
  );
}
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Box, 
  ClipboardList, 
  History, 
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Command Center', path: '/' },
    { icon: Users, label: 'Personnel', path: '/employees' },
    { icon: Box, label: 'Asset Ledger', path: '/assets' },
    { icon: ClipboardList, label: 'Requests', path: '/requests' },
    { icon: History, label: 'Audit History', path: '/audit-history' },
  ];

  return (
    <aside className="w-64 bg-[#0f121d] border-r border-slate-800 flex flex-col sticky top-0 h-screen">
      {/* BRANDING */}
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-white font-black text-xl tracking-tighter uppercase leading-tight">
              AMS <span className="text-red-600">OS</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">v2.0 Stable</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Main Menu</p>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-200"
            )}
          >
            <item.icon size={20} className={cn("transition-colors")} />
            <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* FOOTER / USER */}
      <div className="p-4 border-t border-slate-800/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/5 transition-all transition-colors group">
          <LogOut size={20} />
          <span className="text-xs font-black uppercase tracking-widest">System Logoff</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;


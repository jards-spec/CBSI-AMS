import React from 'react';
import { useAudit } from '../hooks/useAudit';
import { Clock, User, Tag, FileText, ShieldAlert, Trash2, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

const AuditLog = () => {
  const { logs } = useAudit();

  const clearLogs = () => {
    if (window.confirm("STRICT PROTOCOL: Permanent wipe of system audit trail? This action cannot be undone.")) {
      localStorage.setItem('ams_audit_logs', JSON.stringify([]));
      window.location.reload();
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'ADDED': 
      case 'REGISTERED':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case 'UPDATED': 
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
      case 'DELETED': 
        return 'bg-red-600/10 text-red-500 border-red-600/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]';
      case 'CHECKOUT': 
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
      case 'CHECKIN': 
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
      default: 
        return 'bg-slate-800/40 text-slate-400 border-slate-700/50';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
      
      {/* TERMINAL HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800/60 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic flex items-center gap-4">
            <Activity className="text-red-600" size={32} />
            System <span className="text-red-600">Audit Trail</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 italic">
            AssetFlow Terminal // Live Transaction Monitoring // Protocol 9.0
          </p>
        </div>
        
        <button 
          onClick={clearLogs}
          className="group flex items-center gap-3 px-6 py-3 bg-[#0f121d] border border-slate-800 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-red-500 hover:border-red-900/50 transition-all shadow-2xl active:scale-95"
        >
          <Trash2 size={14} className="group-hover:rotate-12 transition-transform" /> 
          Wipe Ledger
        </button>
      </div>

      {/* DATA LEDGER TABLE */}
      <div className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.4)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#161b29]/50 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                <th className="px-8 py-6 italic">Timestamp</th>
                <th className="px-8 py-6 italic">Operator</th>
                <th className="px-8 py-6 italic">Operation</th>
                <th className="px-8 py-6 italic">Entity</th>
                <th className="px-8 py-6 italic">Registry Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20 group">
                      <ShieldAlert size={80} className="text-slate-500 mb-6 group-hover:text-red-600 transition-colors" />
                      <p className="text-slate-500 font-black uppercase italic tracking-[0.5em] text-xs">
                        No Interaction Data Cached
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.slice().reverse().map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* TIMESTAMP */}
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px] font-bold tracking-tighter">
                        <Clock size={14} className="text-red-600/50 group-hover:text-red-600 transition-colors" />
                        {log.timestamp}
                      </div>
                    </td>

                    {/* OPERATOR */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-red-600/30 transition-colors">
                          <User size={14} className="text-slate-600 group-hover:text-slate-300" />
                        </div>
                        <span className="text-white font-black uppercase italic tracking-tighter text-xs">{log.user}</span>
                      </div>
                    </td>

                    {/* ACTION BADGE */}
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1.5 rounded-lg border font-black text-[9px] tracking-[0.15em] uppercase italic inline-block", 
                        getBadgeStyle(log.type)
                      )}>
                        {log.type}
                      </span>
                    </td>

                    {/* ENTITY */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-white font-black font-mono tracking-tighter text-xs">
                        <Tag size={12} className="text-red-600/40" />
                        <span className="bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50">
                          {log.entity || 'SYSTEM'}
                        </span>
                      </div>
                    </td>

                    {/* MESSAGE */}
                    <td className="px-8 py-5 max-w-xs xl:max-w-md">
                      <div className="flex items-center gap-3 text-slate-400 font-bold uppercase italic tracking-tight group-hover:text-slate-200 transition-colors text-[10px]">
                        <FileText size={14} className="shrink-0 text-slate-800 group-hover:text-red-600/50 transition-colors" />
                        <span className="truncate">{log.message}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER STATUS */}
      <div className="flex justify-center">
        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em] italic">
          --- End of Cached Registry ---
        </p>
      </div>
    </div>
  );
};

export default AuditLog;
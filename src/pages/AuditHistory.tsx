import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, Download, 
  Trash2, Calendar, User, Tag, RotateCcw
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';
import { cn } from '../lib/utils';
import { useConfirm } from '../context/ConfirmContext';

const AuditHistory = () => {
  
  const confirmDialog = useConfirm();
const { logs, clearLogs } = useAudit();
  
  // Filter States
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. SAFE FILTERING LOGIC
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchTerm = search.toLowerCase();
      
      // Text Search Check (Prevents 'undefined' crashes)
      const matchesSearch = 
        (log.user ?? '').toLowerCase().includes(searchTerm) ||
        (log.action ?? '').toLowerCase().includes(searchTerm) ||
        (log.target ?? '').toLowerCase().includes(searchTerm) ||
        (log.details ?? '').toLowerCase().includes(searchTerm);

      // Action Category Check
      const matchesAction = filterAction === 'ALL' || log.action === filterAction;

      // Date Range Check
      const logDate = new Date(log.timestamp);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59); // Include full end day

      const matchesDate = (!start || logDate >= start) && (!end || logDate <= end);

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, search, filterAction, startDate, endDate]);

  const actionTypes = ['ALL', ...Array.from(new Set(logs.map(l => l.action)))];

  const handleExport = () => {
    
  const confirmDialog = useConfirm();
const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const resetFilters = () => {
    
  const confirmDialog = useConfirm();
setSearch('');
    setFilterAction('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">System Audit</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Traceability & Security Ledger</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
          >
            <Download size={14} /> Export
          </button>
          <button 
            onClick={async () => {
  const ok = await confirmDialog({
    title: 'Clear Logs',
    message: 'Clear all logs?',
    confirmText: 'Clear',
    cancelText: 'Cancel',
    danger: true,
  });
  if (ok) await clearLogs();
}}
            className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
          >
            <Trash2 size={14} /> Purge
          </button>
        </div>
      </div>

      {/* Advanced Filter Controls */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Search by user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0f121d] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-red-500/50 outline-none transition-all shadow-xl"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Start Date */}
          <div className="flex bg-[#0f121d] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="flex items-center px-3 border-r border-slate-800 bg-slate-800/30 text-[8px] font-black text-slate-500 uppercase">From</div>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="flex-1 bg-transparent px-3 py-3 text-xs text-white outline-none invert-[0.8] brightness-200" 
            />
          </div>

          {/* End Date */}
          <div className="flex bg-[#0f121d] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="flex items-center px-3 border-r border-slate-800 bg-slate-800/30 text-[8px] font-black text-slate-500 uppercase">To</div>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="flex-1 bg-transparent px-3 py-3 text-xs text-white outline-none invert-[0.8] brightness-200" 
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-[#0f121d] border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white focus:border-red-500/50 outline-none appearance-none cursor-pointer shadow-lg"
            >
              {actionTypes.map(type => (
                <option key={type} value={type}>{type === 'ALL' ? 'ALL ACTIONS' : type}</option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <button 
            onClick={resetFilters}
            className="flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest border border-slate-800"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#0f121d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#161b29] border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-5">Timestamp</th>
                <th className="px-6 py-5">Operator</th>
                <th className="px-6 py-5">Action</th>
                <th className="px-6 py-5">Entity</th>
                <th className="px-6 py-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={12} className="text-slate-600" />
                        <span className="text-[10px] font-mono">{log.timestamp}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                          <User size={12} className="text-slate-400" />
                        </div>
                        <span className="text-xs font-black text-white uppercase">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter",
                        log.action === 'LOGIN' ? "bg-blue-500/10 text-blue-500" :
                        log.action === 'DELETE' ? "bg-red-500/10 text-red-500" :
                        log.action === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" :
                        log.action === 'REQUESTED' ? "bg-purple-500/10 text-purple-500" :
                        "bg-slate-700/50 text-slate-300"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                        <Tag size={12} className="text-slate-600" />
                        {log.target}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium italic">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <History size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-600 font-black uppercase text-xs tracking-widest">No matching logs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditHistory;




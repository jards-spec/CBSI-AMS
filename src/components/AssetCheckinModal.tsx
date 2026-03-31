import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, RotateCcw, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AssetCheckinModal({ isOpen, onClose, item, onConfirm }: any) {
  const [formData, setFormData] = useState({
    status: 'Ready to Deploy',
    checkinDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1e232f] border border-slate-700 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden relative">
        {/* Header Strip */}
        <div className="bg-emerald-600 px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl text-white shadow-inner">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest italic leading-none">Resource Return Protocol</h2>
              <p className="text-[9px] text-emerald-200 uppercase font-bold tracking-widest mt-1.5 opacity-80">Indexing Asset Check-in: {item.tag}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white hover:rotate-90 transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onConfirm(formData); }} className="p-10 space-y-8">
          {/* Item Identification Block */}
          <div className="grid grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-slate-800/50">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase italic mb-1 block">Selected Unit</label>
              <p className="text-white font-black text-sm italic uppercase tracking-tight">{item.model}</p>
            </div>
            <div className="text-right">
              <label className="text-[9px] font-black text-slate-500 uppercase italic mb-1 block">Asset ID</label>
              <p className="text-white font-mono text-sm font-bold uppercase tracking-widest">#{item.tag}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1 flex items-center gap-2">
                <AlertTriangle size={12} className="text-emerald-500" /> System Status
              </label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-5 text-white text-[11px] font-black uppercase outline-none focus:border-emerald-600 transition-all appearance-none cursor-pointer shadow-inner"
              >
                <option>Ready to Deploy</option>
                <option>Pending Maintenance</option>
                <option>Broken / Salvage</option>
                <option>Archived</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1 flex items-center gap-2">
                <Calendar size={12} className="text-emerald-500" /> Log Date
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={formData.checkinDate} 
                  onChange={(e) => setFormData({...formData, checkinDate: e.target.value})} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-5 text-white text-[11px] font-black outline-none focus:border-emerald-600 transition-all shadow-inner appearance-none" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1 flex items-center gap-2">
              <FileText size={12} className="text-emerald-500" /> Audit Notes
            </label>
            <textarea 
              rows={4} 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white text-xs outline-none focus:border-emerald-600 transition-all shadow-inner" 
              placeholder="Record any discrepancies, damage, or return details..."
            />
          </div>

          <div className="flex justify-end gap-6 pt-6 border-t border-slate-800/50">
            <button type="button" onClick={onClose} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
              Cancel Protocol
            </button>
            <button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic shadow-xl shadow-emerald-950/40 active:scale-95 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={18} /> Confirm Check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
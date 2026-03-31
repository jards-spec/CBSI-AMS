import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Save, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const LicenseModal = ({ license, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    expirationDate: '',
    licensedEmail: '',
    manufacturer: '',
    minQty: 2,
    total: 10,
    avail: 10
  });

  useEffect(() => {
    if (license) setFormData(license);
  }, [license]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-[#0f121d] border border-slate-800 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] p-10 max-h-[95vh] overflow-y-auto relative">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
              <ShieldCheck className="text-red-600" size={28} />
              {license ? 'Modify' : 'Initialize'} <span className="text-red-600">Entitlement</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
              Registry Update // Protocol 4.0
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-900 border border-slate-800 text-slate-500 hover:text-white rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SOFTWARE NAME */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Software Designation</label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-600 transition-all placeholder:text-slate-800 uppercase"
                placeholder="E.G. ADOBE ACROBAT PRO"
              />
            </div>

            {/* PRODUCT KEY */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registry Key</label>
              <input 
                type="text" 
                required 
                value={formData.key} 
                onChange={(e) => setFormData({...formData, key: e.target.value})} 
                className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-xs font-mono font-bold text-red-500 outline-none focus:border-red-600 transition-all placeholder:text-slate-800"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              />
            </div>

            {/* MANUFACTURER */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Manufacturer</label>
              <input 
                type="text" 
                required
                value={formData.manufacturer} 
                onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} 
                className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-600 transition-all placeholder:text-slate-800 uppercase"
                placeholder="MICROSOFT, ADOBE, ETC."
              />
            </div>

            {/* LICENSED EMAIL */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Licensed Proxy (Email)</label>
              <input 
                type="email" 
                value={formData.licensedEmail} 
                onChange={(e) => setFormData({...formData, licensedEmail: e.target.value})} 
                className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-600 transition-all placeholder:text-slate-800"
                placeholder="ADMIN@ORGANIZATION.COM"
              />
            </div>

            {/* EXPIRATION DATE */}
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contract Expiration</label>
              <input 
                type="date" 
                value={formData.expirationDate} 
                onChange={(e) => setFormData({...formData, expirationDate: e.target.value})} 
                className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-red-600 transition-all uppercase"
              />
            </div>
          </div>

          {/* COUNTERS HUD */}
          <div className="bg-black/40 border border-slate-800/50 rounded-3xl p-6 grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                Total Seats
              </label>
              <input 
                type="number" 
                value={formData.total} 
                onChange={(e) => setFormData({...formData, total: parseInt(e.target.value) || 0})} 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-sm font-black text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Available</label>
              <input 
                type="number" 
                value={formData.avail} 
                onChange={(e) => setFormData({...formData, avail: parseInt(e.target.value) || 0})} 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-sm font-black text-emerald-500 outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Min Alert</label>
              <input 
                type="number" 
                value={formData.minQty} 
                onChange={(e) => setFormData({...formData, minQty: parseInt(e.target.value) || 0})} 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-sm font-black text-orange-500 outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-8 py-4 bg-transparent border border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-900 transition-all italic"
            >
              Abeyance
            </button>
            <button 
              type="submit" 
              className="flex-1 px-8 py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-950/40 hover:bg-red-700 active:scale-95 transition-all italic flex items-center justify-center gap-3"
            >
              <Save size={16} strokeWidth={3} /> {license ? 'Commit Changes' : 'Authorize Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LicenseModal;
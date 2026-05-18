import React from 'react';
import { X } from 'lucide-react';

interface Props { onClose: () => void; }

const AccessoryForm: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="bg-[#1a2332] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      <div className="px-8 py-6 flex justify-between items-center border-b border-slate-800/50">
        <h2 className="text-xl font-bold text-white">Add New Accessory</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
      </div>

      <form className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accessory Name</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Model</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manufacturer</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</label>
          <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantity</label>
            <input type="number" defaultValue={0} className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min Quantity</label>
            <input type="number" defaultValue={0} className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Purchase Cost ($)</label>
            <input type="number" defaultValue={0} className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Purchase Date</label>
            <input type="date" className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all">Add Accessory</button>
        </div>
      </form>
    </div>
  );
};

export default AccessoryForm;

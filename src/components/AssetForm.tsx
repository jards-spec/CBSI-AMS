import React from 'react';
import { X } from 'lucide-react';

interface Props { onClose: () => void; }

const AssetForm: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="bg-[#1a2332] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="px-8 py-6 flex justify-between items-center border-b border-slate-800/50">
        <h2 className="text-xl font-bold text-white">Add New Asset</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <form className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Name</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" placeholder="e.g. MacBook Pro" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Tag</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" placeholder="AST-000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Serial Number</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Model</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
            <select className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none appearance-none">
              <option>Laptop</option>
              <option>Desktop</option>
              <option>Monitor</option>
              <option>Furniture</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</label>
            <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Purchase Date</label>
            <input type="date" className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cost ($)</label>
            <input type="number" defaultValue={0} className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Warranty Expiry</label>
            <input type="date" className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
            <select className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none appearance-none">
              <option>Available</option>
              <option>Assigned</option>
              <option>Maintenance</option>
              <option>Retired</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Image URL</label>
          <input className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none" placeholder="https://example.com/image.jpg" />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
          <textarea rows={3} className="w-full bg-[#111827] border-none rounded-lg p-3 text-slate-300 focus:ring-1 focus:ring-red-600/50 outline-none resize-none" />
        </div>
      </form>

      {/* Footer Actions */}
      <div className="p-8 bg-[#1a2332] flex gap-4 border-t border-slate-800/50">
        <button 
          type="button" 
          onClick={onClose}
          className="flex-1 px-4 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
        >
          Create Asset
        </button>
      </div>
    </div>
  );
};

export default AssetForm;

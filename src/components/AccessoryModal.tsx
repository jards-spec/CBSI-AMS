import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const AccessoryModal = ({ item, onClose, onSave }) => {
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Keyboards',
    modelNo: '',
    location: '',
    minQty: 2,
    total: 10,
    checkedOut: 0
  });

  useEffect(() => {
    if (item) setFormData(item);
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0f121d] border border-slate-800 rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">
            {item ? 'Edit Accessory' : 'Add New Accessory'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accessory Name</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none focus:border-red-500" placeholder="e.g. Magic Mouse" />
          </div>

          <div className="space-y-2 col-span-2 md:col-span-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
              <button 
                type="button" 
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[9px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 uppercase"
              >
                <Plus size={10} /> {isCustomCategory ? 'Select Existing' : 'New'}
              </button>
            </div>
            
            {isCustomCategory ? (
              <input 
                type="text" 
                required 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})} 
                className="w-full bg-[#05070a] border border-red-500/30 rounded-xl p-3 text-slate-300 outline-none focus:border-red-500" 
                placeholder="Type new category..."
                autoFocus
              />
            ) : (
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})} 
                className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none cursor-pointer"
              >
                <option value="Keyboards">Keyboards</option>
                <option value="Mouse">Mouse</option>
                <option value="Cables">Cables</option>
                <option value="Adapters">Adapters</option>
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Model No.</label>
            <input type="text" value={formData.modelNo} onChange={(e) => setFormData({...formData, modelNo: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none" placeholder="e.g. A1657" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none" placeholder="e.g. Storage Room A" />
          </div>

          <div className="grid grid-cols-3 gap-3 col-span-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Stock</label>
              <input type="number" value={formData.total} onChange={(e) => setFormData({...formData, total: parseInt(e.target.value)})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Checked Out</label>
              <input type="number" value={formData.checkedOut} onChange={(e) => setFormData({...formData, checkedOut: parseInt(e.target.value)})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min QTY</label>
              <input type="number" value={formData.minQty} onChange={(e) => setFormData({...formData, minQty: parseInt(e.target.value)})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none" />
            </div>
          </div>

          <div className="flex gap-4 pt-6 col-span-2">
            <button type="button" onClick={onClose} className="flex-1 text-slate-500 font-bold hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all">Save Accessory</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccessoryModal;

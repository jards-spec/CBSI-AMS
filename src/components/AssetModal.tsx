import React, { useState, useEffect } from 'react';
import { X, Plus, Hash, Building, Landmark, DollarSign, Calendar, Package } from 'lucide-react';

interface Props {
  asset?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const AssetModal: React.FC<Props> = ({ asset, onClose, onSave }) => {
  const isEditing = !!asset;
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Expanded fields to match your reference screenshots
  const [formData, setFormData] = useState({
    name: '',
    category: 'Laptop',
    modelNo: '',
    serialNo: '',
    status: 'Available',
    location: '',
    manufacturer: '',
    purchaseDate: '',
    unitCost: '',
    notes: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        category: asset.category || 'Laptop',
        modelNo: asset.modelNo || '',
        serialNo: asset.serialNo || '',
        status: asset.status || 'Available',
        location: asset.location || '',
        manufacturer: asset.manufacturer || '',
        purchaseDate: asset.purchaseDate || '',
        unitCost: asset.unitCost || '',
        notes: asset.notes || ''
      });
    }
  }, [asset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1e232f] border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#161b29] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/10 rounded-lg">
              <Package className="text-red-600" size={20} />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest italic">
              {isEditing ? 'Update Asset Entry' : 'Register New Asset Unit'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* DEVICE NAME - FULL WIDTH */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Device Name</label>
            <input 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-xs outline-none focus:border-red-500 transition-all font-bold placeholder:text-slate-700"
              placeholder="e.g. MacBook Pro 14-inch M3"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CATEGORY SELECT/INPUT */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Category</label>
                <button 
                  type="button" 
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[9px] font-black text-red-600 hover:text-red-400 uppercase tracking-tighter flex items-center gap-1"
                >
                  <Plus size={10} strokeWidth={3} /> {isCustomCategory ? 'Use List' : 'Add New'}
                </button>
              </div>
              {isCustomCategory ? (
                <input 
                  required autoFocus
                  className="w-full bg-slate-900 border border-red-900/50 rounded-xl p-3 text-white text-[10px] font-black uppercase outline-none focus:border-red-500"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                />
              ) : (
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-[10px] font-black uppercase outline-none focus:border-red-500 appearance-none cursor-pointer"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Mobile">Mobile Device</option>
                  <option value="Peripheral">Peripheral</option>
                </select>
              )}
            </div>

            {/* STATUS SELECT */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Initial Status</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-[10px] font-black uppercase outline-none focus:border-red-500 appearance-none cursor-pointer"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            {/* SERIAL NUMBER */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Serial Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-[10px] font-mono outline-none focus:border-red-500 transition-all"
                  placeholder="SN-XXXX-XXXX"
                  value={formData.serialNo}
                  onChange={e => setFormData({...formData, serialNo: e.target.value})}
                />
              </div>
            </div>

            {/* MODEL NUMBER */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Model Number</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-[10px] font-black outline-none focus:border-red-500 transition-all uppercase"
                placeholder="e.g. A2941"
                value={formData.modelNo}
                onChange={e => setFormData({...formData, modelNo: e.target.value})}
              />
            </div>

            {/* MANUFACTURER */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Manufacturer</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-[10px] font-black outline-none focus:border-red-500 uppercase"
                  placeholder="e.g. APPLE / DELL"
                  value={formData.manufacturer}
                  onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                />
              </div>
            </div>

            {/* UNIT COST */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Unit Cost (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                <input 
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-[10px] font-black outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  value={formData.unitCost}
                  onChange={e => setFormData({...formData, unitCost: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Deployment Location</label>
            <input 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-[10px] font-black outline-none focus:border-red-500 uppercase italic"
              placeholder="e.g. MAIN OFFICE / STORAGE A"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors">Abort</button>
            <button type="submit" className="bg-red-600 px-10 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 hover:bg-red-500 shadow-lg shadow-red-900/40 active:scale-95 transition-all italic">
               {isEditing ? 'Sync Changes' : 'Initialize Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetModal;
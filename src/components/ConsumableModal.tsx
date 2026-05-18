import React, { useState, useEffect } from 'react';
import { X, Plus, DollarSign, CalendarDays } from 'lucide-react';

interface Props {
  item?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const ConsumableModal: React.FC<Props> = ({ item, onClose, onSave }) => {
  const isEditing = !!item;
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Printer Paper',
    modelNo: '',
    location: '',
    itemNo: '',
    orderNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Default to today
    minQty: 2,
    total: 20,
    remaining: 20,
    unitCost: 0,
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#0f121d] border border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 p-8 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800/50 pb-6 mb-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            {isEditing ? 'Edit Consumable Line Item' : 'Add New Consumable Stock'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          
          {/* Item Name */}
          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 focus:border-red-500 outline-none transition-all placeholder:text-slate-700" placeholder="e.g. LaserJet Toner (black)" />
          </div>

          {/* Category Section */}
          <div className="space-y-2 col-span-2 md:col-span-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
              <button type="button" onClick={() => setIsCustomCategory(!isCustomCategory)} className="text-[9px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 uppercase">
                <Plus size={10} /> {isCustomCategory ? 'Select Existing' : 'Define New Category'}
              </button>
            </div>
            {isCustomCategory ? (
              <input type="text" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-[#05070a] border border-red-500/30 rounded-xl p-3.5 text-slate-300 outline-none focus:border-red-500" placeholder="Type new category..." autoFocus />
            ) : (
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none cursor-pointer">
                <option value="Printer Ink">Printer Ink</option>
                <option value="Printer Paper">Printer Paper</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Stationery">Stationery</option>
              </select>
            )}
          </div>

          {/* Model No. / Item No. Grid */}
          <div className="grid grid-cols-2 gap-4 col-span-2 md:col-span-1">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Model No.</label>
              <input type="text" value={formData.modelNo} onChange={(e) => setFormData({...formData, modelNo: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none" placeholder="e.g. CE285A" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Item No.</label>
              <input type="text" value={formData.itemNo} onChange={(e) => setFormData({...formData, itemNo: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none" placeholder="8473156" />
            </div>
          </div>

          {/* Logistics: Location and Order No */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location / Storage Bin</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none" placeholder="Main Cabinet / shelf B" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Number</label>
            <input type="text" value={formData.orderNumber} onChange={(e) => setFormData({...formData, orderNumber: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none" placeholder="e.g. PO-9981" />
          </div>

          {/* Purchase Date */}
          <div className="space-y-2 col-span-2 md:col-span-1 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Purchase Date</label>
            <div className="relative">
                <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none" />
            </div>
          </div>

          {/* Cost and Bulk Stock Grid */}
          <div className="grid grid-cols-4 gap-3 col-span-2">
            <div className="space-y-2 col-span-2 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Cost (PHP)</label>
                <div className="relative">
                    <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input type="number" step="0.01" required value={formData.unitCost} onChange={(e) => setFormData({...formData, unitCost: parseFloat(e.target.value)})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none" />
                </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</label>
              <input type="number" value={formData.total} onChange={(e) => setFormData({...formData, total: parseInt(e.target.value)})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none text-center font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min QTY</label>
              <input type="number" value={formData.minQty} onChange={(e) => setFormData({...formData, minQty: parseInt(e.target.value)})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-slate-300 outline-none text-center" />
            </div>
          </div>

          <div className="flex gap-4 pt-8 col-span-2 border-t border-slate-800/50 mt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-4 text-sm font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Cancel</button>
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all uppercase tracking-widest">
              Save Line Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsumableModal;


import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Copy } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAudit } from '../context/AuditContext';
import ConsumableModal from '../components/ConsumableModal';

const Consumables = () => {
  const { addLog } = useAudit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('ams_consumables');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'LaserJet Toner (black)', category: 'Printer Ink', modelNo: 'HP CE285A', location: 'Storage B-04', itemNo: '8473156', orderNumber: '8803332', purchaseDate: '2025-09-17', minQty: 2, total: 20, remaining: 20, unitCost: 46.31 },
      { id: 2, name: 'LaserJet Paper (Ream)', category: 'Printer Paper', modelNo: '80GSM A4', location: 'Office Shelf 4', itemNo: '33504317', orderNumber: '22851185', purchaseDate: '2025-08-21', minQty: 2, total: 20, remaining: 20, unitCost: 45.43 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('ams_consumables', JSON.stringify(items));
  }, [items]);

  const handleSave = (formData: any) => {
    // --- NUMERIC & FIELD VALIDATION ---
    if (!formData.name?.trim() || formData.total <= 0 || formData.unitCost <= 0) {
      alert("❌ ENTRY REJECTED: Item name is required. Stock and Cost must be greater than zero.");
      return;
    }

    if (editingItem) {
      setItems((prev: any) => prev.map((i: any) => i.id === editingItem.id ? { ...i, ...formData } : i));
      addLog('UPDATED', formData.name, 'CONSUMABLE', `Stock levels revised.`);
    } else {
      const newItem = { ...formData, id: Date.now() };
      setItems((prev: any) => [newItem, ...prev]);
      addLog('ADDED', formData.name, 'CONSUMABLE', `Added to inventory.`);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleCheckout = (id: number, name: string) => {
    setItems((prev: any) => prev.map((item: any) => {
      if (item.id === id && item.remaining > 0) {
        addLog('CHECKOUT', name, 'CONSUMABLE', `1 unit issued.`);
        return { ...item, remaining: item.remaining - 1 };
      }
      return item;
    }));
  };

  const filteredItems = items.filter((item: any) =>
    (item.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.itemNo ?? '').includes(searchQuery)
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Consumables Inventory</h1>
          <p className="text-slate-500 text-[10px] italic">Compact View: All data fields preserved.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              type="text" placeholder="Search..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0f121d] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-300 outline-none w-56 focus:border-red-500/50"
            />
          </div>
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-black text-[11px] uppercase tracking-wider transition-all"
          >
            <Plus size={16} /> Add Supply
          </button>
        </div>
      </div>

      <div className="bg-[#10141d] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-[#1c2230] border-b border-slate-800">
            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="w-[18%] px-4 py-4">Name / Category</th>
              <th className="w-[15%] px-2 py-4">Model / Item No.</th>
              <th className="w-[15%] px-2 py-4">Location / Order</th>
              <th className="w-[10%] px-2 py-4">Purchase Date</th>
              <th className="w-[12%] px-2 py-4 text-center">Stock (Min/Tot/Rem)</th>
              <th className="w-[10%] px-2 py-4">Costs (Unit/Total)</th>
              <th className="w-[10%] px-2 py-4 text-center">In/Out</th>
              <th className="w-[10%] px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filteredItems.map((item: any) => {
              const percent = (item.remaining / item.total) * 100;
              const totalCost = (item.remaining * item.unitCost).toFixed(2);
              
              return (
                <tr key={item.id} className="hover:bg-slate-800/20 transition-colors text-[10px] text-slate-300">
                  <td className="px-4 py-3">
                    <div className="font-bold text-cyan-500 truncate">{item.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 uppercase font-bold text-[8px] text-slate-500">
                      <div className={cn("w-1.5 h-1.5 rounded-full", (item.category ?? '').includes('Ink') ? 'bg-red-800' : 'bg-purple-600')} />
                      {item.category}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="truncate text-slate-400 font-medium">{item.modelNo || '--'}</div>
                    <div className="text-[9px] text-slate-600 font-mono">ID: {item.itemNo}</div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="text-cyan-600/80 font-medium">{item.location || '--'}</div>
                    <div className="text-[9px] text-slate-600">PO: {item.orderNumber || '--'}</div>
                  </td>
                  <td className="px-2 py-3 text-slate-500">
                    <div className="font-medium">{item.purchaseDate}</div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex justify-center gap-2 font-bold mb-1">
                      <span className="text-slate-600">{item.minQty}</span>
                      <span className="text-slate-400">{item.total}</span>
                      <span className="text-white">{item.remaining}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden w-20 mx-auto">
                      <div 
                        className={cn("h-full transition-all", percent < 25 ? "bg-orange-500" : "bg-emerald-500")} 
                        style={{ width: `${percent}%` }} 
                      />
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="text-slate-500 font-medium">Unit: {item.unitCost}</div>
                    <div className="text-white font-bold">Total: {totalCost}</div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button 
                      onClick={() => handleCheckout(item.id, item.name)}
                      className="bg-[#d63384] hover:bg-[#b52a6f] text-white text-[9px] font-black px-3 py-1.5 rounded-sm transition-all uppercase"
                    >
                      Checkout
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="p-1.5 bg-cyan-500/10 text-cyan-500 rounded-sm hover:bg-cyan-500 hover:text-white transition-all"><Copy size={12}/></button>
                      <button 
                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                        className="p-1.5 bg-orange-500/10 text-orange-500 rounded-sm hover:bg-orange-500 hover:text-white transition-all"
                      >
                        <Edit2 size={12}/>
                      </button>
                      <button 
                        onClick={() => { if(confirm('Delete?')) setItems(items.filter((i:any) => i.id !== item.id)) }}
                        className="p-1.5 bg-red-500/10 text-red-500 rounded-sm hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && <ConsumableModal item={editingItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

export default Consumables;
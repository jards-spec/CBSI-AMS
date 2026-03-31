import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, LayoutGrid, List, Copy, Keyboard, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAudit } from '../context/AuditContext';
import AccessoryModal from '../components/AccessoryModal';

const DEFAULT_ACCESSORIES = [
  { id: 1, name: 'USB Keyboard', category: 'Keyboards', modelNo: '22623635', location: 'North Claremouth', minQty: 2, total: 15, checkedOut: 0 },
  { id: 2, name: 'Magic Mouse', category: 'Mouse', modelNo: '18069271', location: 'Port Berniceland', minQty: 2, total: 13, checkedOut: 0 },
];

const Accessories = () => {
  const { addLog } = useAudit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('ams_accessories');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_ACCESSORIES;
    } catch (e) {
      return DEFAULT_ACCESSORIES;
    }
  });

  useEffect(() => {
    localStorage.setItem('ams_accessories', JSON.stringify(items));
  }, [items]);

  const handleSave = (formData: any) => {
    // Empty Field Validation
    if (!formData.name?.trim() || !formData.category?.trim() || !formData.location?.trim()) {
      alert("Validation Error: Name, Category, and Location are required.");
      return;
    }

    if (editingItem) {
      setItems((prev: any) => prev.map((i: any) => i.id === editingItem.id ? { ...i, ...formData } : i));
      addLog('UPDATED', formData.name, 'ACCESSORY', `Updated stock/location`);
    } else {
      const newItem = { ...formData, id: Date.now() };
      setItems((prev: any) => [newItem, ...prev]);
      addLog('ADDED', formData.name, 'ACCESSORY', `Added to inventory`);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleCheckout = (id: number, name: string) => {
    setItems((prev: any) => prev.map((item: any) => {
      if (item.id === id && (item.total - item.checkedOut) > 0) {
        addLog('CHECKOUT', name, 'ACCESSORY', `Item issued to staff`);
        return { ...item, checkedOut: item.checkedOut + 1 };
      }
      return item;
    }));
  };

  const handleDelete = (item: any) => {
    if (window.confirm(`Delete ${item.name}?`)) {
      setItems((prev: any) => prev.filter((i: any) => i.id !== item.id));
      addLog('DELETED', item.name, 'ACCESSORY', `Item removed`);
    }
  };

  const filteredItems = items.filter((i: any) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.modelNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Accessories</h1>
          <p className="text-slate-500 text-xs italic">Managing hardware peripherals and desk equipment.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-[#0f121d] border border-slate-800 p-1 rounded-lg flex">
            <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-md", viewMode === 'grid' ? "bg-red-600 text-white" : "text-slate-500")}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('table')} className={cn("p-1.5 rounded-md", viewMode === 'table' ? "bg-red-600 text-white" : "text-slate-500")}>
              <List size={16} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input type="text" placeholder="Search accessories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#0f121d] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-300 outline-none w-64" />
          </div>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-red-600/20 active:scale-95 transition-all">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="bg-[#0f121d] border border-slate-800/60 rounded-2xl p-5 hover:border-red-500/30 transition-all">
               <div className="flex justify-between mb-4">
                  <div className="text-red-500 bg-red-500/10 p-2 rounded-lg">
                    {item.category === 'Keyboards' ? <Keyboard size={20}/> : <MousePointer2 size={20}/>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {setEditingItem(item); setIsModalOpen(true);}} className="p-1 text-slate-500 hover:text-white"><Edit2 size={14}/></button>
                    <button onClick={() => handleDelete(item)} className="p-1 text-slate-500 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
               </div>
               <h3 className="font-bold text-white text-sm truncate uppercase">{item.name}</h3>
               <p className="text-[10px] text-slate-500 mb-4 font-mono">{item.modelNo}</p>
               <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{item.total - item.checkedOut} <span className="text-slate-600">Left</span></span>
                  <button onClick={() => handleCheckout(item.id, item.name)} className="text-[9px] font-black bg-[#d63384] text-white px-3 py-1 rounded">Checkout</button>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0f121d] border border-slate-800/60 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#161b22] border-b border-slate-800">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-4 py-4">Name</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Model No.</th>
                  <th className="px-4 py-4">Location</th>
                  <th className="px-4 py-4 text-center">Min. QTY</th>
                  <th className="px-4 py-4 text-center">Total</th>
                  <th className="px-4 py-4 text-center">Checked Out</th>
                  <th className="px-4 py-4 text-center">% Remaining</th>
                  <th className="px-4 py-4">In/Out</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredItems.map((item: any) => {
                  const avail = item.total - item.checkedOut;
                  const percentRemaining = (avail / item.total) * 100;
                  const barColor = percentRemaining < 20 ? 'bg-orange-500' : 'bg-emerald-500';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors text-[11px] text-slate-300">
                      <td className="px-4 py-4 font-bold text-cyan-400">{item.name}</td>
                      <td className="px-4 py-4 uppercase text-[10px] text-slate-500 font-bold">{item.category}</td>
                      <td className="px-4 py-4 text-cyan-600 font-medium">{item.modelNo}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-cyan-600/80">
                          <span className="text-emerald-500">■</span> {item.location}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-600">{item.minQty}</td>
                      <td className="px-4 py-4 text-center font-bold">{item.total}</td>
                      <td className="px-4 py-4 text-center font-bold text-white">{item.checkedOut}</td>
                      <td className="px-4 py-4 min-w-[120px]">
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all duration-700", barColor)} style={{ width: `${percentRemaining}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={() => handleCheckout(item.id, item.name)} className="bg-[#d63384] hover:bg-[#b52a6f] text-white text-[9px] font-black px-4 py-1.5 rounded transition-all uppercase tracking-tighter shadow-sm">
                          Checkout
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button className="p-1.5 bg-cyan-600 rounded text-white hover:bg-cyan-700"><Copy size={12}/></button>
                          <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 bg-orange-500 rounded text-white hover:bg-orange-600"><Edit2 size={12}/></button>
                          <button onClick={() => handleDelete(item)} className="p-1.5 bg-red-800 rounded text-white hover:bg-red-900"><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && <AccessoryModal item={editingItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

export default Accessories;
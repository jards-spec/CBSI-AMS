import React, { useState, useMemo, useEffect } from 'react';
import { 
  Cpu, Plus, Search, Edit2, Trash2, Box, Package2, BadgeDollarSign, 
  X, Save, User, Bell, HardDrive, Layout, Activity
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';
import { useTransaction } from '../hooks/useTransaction';
import { cn } from '../lib/utils';

interface ComponentItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQty: number;
  serial: string;
  manufacturer: string;
  location: string;
  unitCost: number;
  remaining: number;
  notes?: string;
}

const Components = () => {
  const { addLog } = useAudit();
  const { checkoutItem: processTransaction } = useTransaction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<ComponentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pull dynamic employees for the checkout dropdown
  const [employees] = useState(() => {
    const saved = localStorage.getItem('ams_employees');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'W. Del Rosario', department: 'MIS' },
      { id: '2', name: 'J. Doe', department: 'HR' },
      { id: '3', name: 'Clint Perlas', department: 'ENG' }
    ];
  });

  const [components, setComponents] = useState<ComponentItem[]>(() => {
    const saved = localStorage.getItem('ams_consumables');
    return saved ? JSON.parse(saved) : [];
  });

  const [formData, setFormData] = useState<Partial<ComponentItem>>({
    category: 'RAM',
    location: '',
    manufacturer: '',
  });

  // Keep your exact analytics logic
  const { lowStockCount, totalValuation, filteredComponents } = useMemo(() => {
    const filtered = components.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serial?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lowStock = components.filter(c => Number(c.remaining) <= Number(c.minQty)).length;
    const valuation = components.reduce((sum, c) => sum + (Number(c.remaining) * (Number(c.unitCost) || 0)), 0);

    return { 
      lowStockCount: lowStock, 
      totalValuation: valuation.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      filteredComponents: filtered 
    };
  }, [components, searchQuery]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      ...formData,
      id: Date.now().toString(),
      remaining: Number(formData.quantity) || 0,
      quantity: Number(formData.quantity) || 0,
    } as ComponentItem;

    const updated = [newItem, ...components];
    setComponents(updated);
    localStorage.setItem('ams_consumables', JSON.stringify(updated));
    addLog('ADDED', 'Admin', 'COMPONENT', `New component registered: ${newItem.name} (SN-${newItem.serial})`);
    setIsModalOpen(false);
  };

  // Updated to use the useTransaction hook while keeping your UI flow
  const handleCheckout = (employeeName: string) => {
    if (!checkoutItem || !employeeName) return;
    
    const updated = processTransaction(checkoutItem, 'consumables', {
      user: employeeName,
      date: new Date().toISOString(),
      qty: 1
    });

    setComponents(updated);
    setCheckoutItem(null);
  };

  const getTypeIcon = (cat: string) => {
    const c = cat?.toLowerCase();
    if (c?.includes('ssd') || c?.includes('hdd') || c?.includes('storage')) return <HardDrive size={18} />;
    if (c?.includes('ram') || c?.includes('memory')) return <Layout size={18} />;
    if (c?.includes('gpu') || c?.includes('video')) return <Activity size={18} />;
    return <Cpu size={18} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3 italic">
            <Box className="text-red-600" size={28} />
            Hardware <span className="text-red-600">Components</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
            Part Registry // {components.length} Line Items Indexed
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <div className="bg-red-600/10 border border-red-600/20 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-pulse">
              <Bell className="text-red-600" size={14} />
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{lowStockCount} LOW STOCK ALERTS</span>
            </div>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#10b981] hover:bg-[#059669] text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20 italic"
          >
            <Plus size={18} strokeWidth={3} /> New Component
          </button>
        </div>
      </div>

      {/* QUICK ANALYTICS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f121d] border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500"><Package2 size={20} /></div>
          <div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Units in Stock</p>
            <p className="text-xl font-black text-white italic">{components.reduce((a, b) => a + Number(b.remaining), 0)}</p>
          </div>
        </div>
        <div className="bg-[#0f121d] border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500"><BadgeDollarSign size={20} /></div>
          <div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Estimated Valuation</p>
            <p className="text-xl font-black text-white italic">₱{totalValuation}</p>
          </div>
        </div>
        <div className="bg-[#0f121d] border border-slate-800 p-4 rounded-2xl flex items-center px-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH BY NAME / SERIAL..."
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 text-[10px] font-black text-white placeholder:text-slate-700 uppercase tracking-[0.2em] focus:border-emerald-500 outline-none transition-all"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-[#0f121d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#161b29] border-b border-slate-800">
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Hardware Details</th>
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Serial Number</th>
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Stock Availability</th>
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Unit Cost</th>
              <th className="p-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filteredComponents.map((item) => {
              const isLow = item.remaining <= item.minQty;
              return (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-red-500 border border-slate-800 group-hover:border-emerald-500/50 transition-all shadow-inner">
                        {getTypeIcon(item.category)}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white uppercase italic tracking-tight group-hover:text-emerald-500 transition-colors">{item.name}</div>
                        <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{item.category} // {item.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-center font-mono text-[10px] text-slate-400">{item.serial}</td>
                  <td className="p-5 w-56">
                    <div className="flex justify-between text-[8px] font-black uppercase mb-1.5 italic">
                      <span className={cn(isLow ? "text-red-500 animate-pulse" : "text-emerald-500")}>
                        {item.remaining} {isLow ? 'CRITICAL STOCK' : 'AVAILABLE'}
                      </span>
                      <span className="text-slate-600">{Math.round((item.remaining / (item.quantity || 1)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={cn("h-full transition-all duration-1000", 
                          isLow ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        )} 
                        style={{ width: `${(item.remaining / (item.quantity || 1)) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-5 text-center font-black text-white italic text-xs">₱{Number(item.unitCost).toLocaleString()}</td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setCheckoutItem(item)}
                        disabled={item.remaining === 0}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all italic",
                          item.remaining > 0 ? "bg-pink-600 text-white hover:bg-pink-700 shadow-lg shadow-pink-900/20" : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        )}
                      >
                        Checkout
                      </button>
                      <button className="p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors group-hover:border-slate-700"><Edit2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* RE-STYLED REGISTER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="bg-[#1e232f] border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#161b29]">
              <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Part Entry Terminal</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase italic">Component Name</label>
                <input required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-xs outline-none focus:border-emerald-500 transition-all font-bold" placeholder="e.g. Kingston Fury 32GB Kit" onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic">Category</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-[10px] font-black uppercase outline-none focus:border-emerald-500" onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="RAM">RAM</option>
                    <option value="HDD/SSD">HDD/SSD</option>
                    <option value="Peripherals">Peripherals</option>
                    <option value="Network">Network</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic">Serial No</label>
                  <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-emerald-500" placeholder="SN-..." onChange={e => setFormData({...formData, serial: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic">Quantity</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-emerald-500" onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic">Unit Cost (₱)</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-emerald-500" onChange={e => setFormData({...formData, unitCost: Number(e.target.value)})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase hover:text-white">Abort</button>
                <button type="submit" className="bg-[#10b981] px-10 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 hover:bg-[#059669] shadow-lg shadow-emerald-900/30">
                  <Save size={16} /> Finalize Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {checkoutItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0f121d] border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-pink-600/10 border border-pink-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="text-pink-600" size={32} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Confirm Deployment</h3>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest mt-1">Assigning: {checkoutItem.name}</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Assign to Custodian</label>
                <select id="emp-select" className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white text-xs font-bold outline-none focus:border-pink-500 appearance-none cursor-pointer">
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.name}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setCheckoutItem(null)} className="flex-1 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white">Cancel</button>
                <button 
                  onClick={() => handleCheckout((document.getElementById('emp-select') as HTMLSelectElement).value)}
                  className="flex-1 bg-pink-600 py-4 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-pink-900/40 hover:bg-pink-500 transition-all active:scale-95 italic"
                >
                  Verify Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Components;
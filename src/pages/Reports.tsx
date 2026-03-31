import React, { useState } from 'react';
import { Package, ShieldCheck, ListChecks, History, Printer, Filter } from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('Inventory');
  const tabs = [
    { id: 'Inventory', icon: Package },
    { id: 'Licenses', icon: ShieldCheck },
    { id: 'Consumables', icon: ListChecks },
    { id: 'Audit', icon: History }
  ];

  return (
    <div className="p-10 bg-[#05070a] min-h-screen text-slate-300">
      <div className="flex justify-between items-end mb-10 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">System Reports</h2>
          <div className="flex gap-4 mt-6">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === tab.id ? 'bg-red-600 border-red-500 text-white' : 'bg-[#0f121d] border-slate-800 text-slate-500 hover:text-white'}`}
              >
                <tab.icon size={14} /> {tab.id}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => window.print()} className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl transition-all hover:bg-slate-200 active:scale-95">
          <Printer size={18} /> Generate Hardcopy
        </button>
      </div>

      <div className="bg-[#0f121d] border border-slate-800 rounded-3xl overflow-hidden print:border-none print:bg-white print:text-black">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center print:border-black">
          <span className="text-sm font-black uppercase tracking-widest">{activeTab} Master List</span>
          <span className="text-[10px] font-mono opacity-50 uppercase">As of {new Date().toLocaleDateString()}</span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[#161b29] text-[10px] font-black uppercase text-slate-500 print:bg-slate-100 print:text-black">
            <tr>
              <th className="p-6">Line Item / Asset</th>
              <th className="p-6">Category</th>
              <th className="p-6">Reference No.</th>
              <th className="p-6 text-right">Valuation / Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 print:divide-black">
            <tr className="hover:bg-white/5 transition-colors">
              <td className="p-6 font-bold text-white uppercase print:text-black italic">HP LaserJet 107a Toner</td>
              <td className="p-6 text-[10px] font-black uppercase text-red-500">{activeTab}</td>
              <td className="p-6 font-mono text-slate-500">PO-2026-99</td>
              <td className="p-6 text-right font-black text-white print:text-black">₱ 3,450.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
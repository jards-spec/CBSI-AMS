import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, Search, Edit2, Trash2, 
  LayoutGrid, List, Key, Lock, Unlock, Calendar, 
  Building2, MousePointer2, AlertTriangle, Hash
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAudit } from '../context/AuditContext';
import { useTransaction } from '../hooks/useTransaction';
import LicenseModal from '../components/LicenseModal';

const DEFAULT_LICENSES = [
  { 
    id: 1, 
    name: 'Acrobat Pro', 
    key: 'a37f6944-158f-3782-99b7-a5bb1f025d87', 
    expirationDate: '2026-12-01', 
    licensedEmail: 'adele42@example.net', 
    manufacturer: 'Adobe', 
    minQty: 2, 
    total: 10, 
    avail: 6 
  },
  { 
    id: 2, 
    name: 'Office 365 Business', 
    key: 'ecad85fe-9633-3706-ad18-b71623d3ae9e', 
    expirationDate: '2027-01-15', 
    licensedEmail: 'eve.schneider@example.com', 
    manufacturer: 'Microsoft', 
    minQty: 5, 
    total: 20, 
    avail: 12 
  }
];

const SoftwareLicenses = () => {
  const { addLog } = useAudit();
  const { checkoutItem } = useTransaction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});

  const [licenses, setLicenses] = useState(() => {
    const saved = localStorage.getItem('ams_licenses');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_LICENSES;
    } catch (e) {
      return DEFAULT_LICENSES;
    }
  });

  useEffect(() => {
    localStorage.setItem('ams_licenses', JSON.stringify(licenses));
  }, [licenses]);

  const toggleKey = (id: number) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveLicense = (formData: any) => {
    if (!formData.name?.trim() || !formData.key?.trim() || !formData.manufacturer?.trim()) {
      alert("VALIDATION FAILED: Software Name, Product Key, and Manufacturer are mandatory.");
      return;
    }

    if (editingLicense) {
      const updated = licenses.map((lic: any) => lic.id === editingLicense.id ? { ...lic, ...formData } : lic);
      setLicenses(updated);
      addLog('UPDATED', 'Admin', 'LICENSE', `Modified credentials for ${formData.name}`);
    } else {
      const newLicense = { ...formData, id: Date.now() };
      setLicenses((prev: any) => [newLicense, ...prev]);
      addLog('REGISTERED', 'Admin', 'LICENSE', `Registered new software: ${formData.name}`);
    }
    setIsModalOpen(false);
    setEditingLicense(null);
  };

  const handleDeploy = (lic: any) => {
    if (lic.avail <= 0) return;
    const updated = checkoutItem(lic, 'licenses', {
      user: 'Production Seat',
      date: new Date().toISOString(),
      qty: 1
    });
    setLicenses(updated);
  };

  const handleDelete = (license: any) => {
    if (window.confirm(`STRICT PROTOCOL: Permanently purge ${license.name} from records?`)) {
      const updated = licenses.filter((l: any) => l.id !== license.id);
      setLicenses(updated);
      addLog('DELETED', 'Admin', 'LICENSE', `Purged entitlement: ${license.name}`);
    }
  };

  const filteredLicenses = licenses.filter((lic: any) =>
    lic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lic.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lic.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3 italic">
            <ShieldCheck className="text-red-600" size={32} />
            Software <span className="text-red-600">Compliance</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
            AssetFlow // {licenses.length} Contracts Indexed
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-[#0f121d] border border-slate-800 p-1.5 rounded-2xl flex shadow-2xl">
            <button onClick={() => setViewMode('grid')} className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-red-600 text-white shadow-lg shadow-red-900/40" : "text-slate-600 hover:text-slate-400")}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setViewMode('table')} className={cn("p-3 rounded-xl transition-all", viewMode === 'table' ? "bg-red-600 text-white shadow-lg shadow-red-900/40" : "text-slate-600 hover:text-slate-400")}>
              <List size={18} />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-500 transition-colors" size={16} />
            <input 
              type="text" placeholder="FILTER ENTITLEMENTS..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0f121d] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-[10px] font-black text-white placeholder:text-slate-700 uppercase tracking-widest focus:outline-none focus:border-red-600 w-72 transition-all shadow-2xl"
            />
          </div>

          <button 
            onClick={() => { setEditingLicense(null); setIsModalOpen(true); }} 
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-950/20 active:scale-95 transition-all italic"
          >
            <Plus size={18} strokeWidth={4} /> Add Entitlement
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredLicenses.map((lic: any) => {
              const usagePercent = (lic.avail / lic.total) * 100;
              return (
                <div key={lic.id} className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] p-8 group hover:border-red-600/40 transition-all duration-500 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-500">
                       <Hash size={24} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {setEditingLicense(lic); setIsModalOpen(true);}} className="p-2.5 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:text-white hover:border-slate-700 transition-all"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(lic)} className="p-2.5 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:text-red-500 hover:border-red-900/50 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">{lic.name}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Building2 size={14} className="text-red-600" /> {lic.manufacturer}
                  </p>

                  <div className="bg-black/40 p-4 rounded-2xl border border-slate-800/50 mb-8 flex items-center justify-between">
                     <code className="text-[10px] font-mono text-slate-400 italic">
                       {showKeys[lic.id] ? lic.key : '••••-••••-••••-••••'}
                     </code>
                     <button onClick={() => toggleKey(lic.id)} className="text-slate-600 hover:text-white transition-colors">
                       {showKeys[lic.id] ? <Lock size={16} /> : <Unlock size={16} />}
                     </button>
                  </div>

                  <div className="space-y-3 border-t border-slate-800/50 pt-6">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500 italic">Availability</span>
                      <span className={cn(usagePercent < 20 ? "text-red-500 animate-pulse" : "text-emerald-500")}>
                         {lic.avail} / {lic.total} Seats
                      </span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                       <div 
                         className={cn("h-full transition-all duration-1000", usagePercent < 20 ? "bg-red-600" : "bg-emerald-500")} 
                         style={{ width: `${usagePercent}%` }} 
                       />
                    </div>
                    <button 
                      onClick={() => handleDeploy(lic)} 
                      disabled={lic.avail === 0}
                      className="w-full mt-4 bg-slate-900 border border-slate-800 hover:bg-red-600 hover:text-white text-slate-400 text-[10px] font-black py-4 rounded-2xl transition-all uppercase tracking-widest italic flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Deploy Resource <MousePointer2 size={16} />
                    </button>
                  </div>
                </div>
              );
          })}
        </div>
      ) : (
        <div className="bg-[#0f121d] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic border-b border-slate-800">
                <th className="px-8 py-6">Entitlement</th>
                <th className="px-8 py-6">Security Key</th>
                <th className="px-8 py-6">Manufacturer</th>
                <th className="px-8 py-6">Seats Utilization</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredLicenses.map((lic: any) => {
                const usagePercent = (lic.avail / lic.total) * 100;
                return (
                  <tr key={lic.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white uppercase italic tracking-tighter">{lic.name}</span>
                        <span className="text-[9px] text-slate-600 font-bold uppercase flex items-center gap-1 mt-1">
                          <Calendar size={12} className="text-red-600" /> EXP: {lic.expirationDate || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3 bg-black/40 border border-slate-800 rounded-xl px-4 py-2 w-max">
                        <code className="text-[10px] font-mono text-slate-500">{showKeys[lic.id] ? lic.key : '••••-••••-••••'}</code>
                        <button onClick={() => toggleKey(lic.id)} className="text-slate-700 hover:text-white transition-all"><Key size={14} /></button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black text-slate-400 bg-slate-900/50 border border-slate-800 px-4 py-1.5 rounded-xl uppercase tracking-widest">
                         {lic.manufacturer}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4 min-w-[160px]">
                         <span className={cn("text-[10px] font-black", usagePercent < 20 ? "text-red-500" : "text-white")}>{lic.avail}/{lic.total}</span>
                         <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className={cn("h-full transition-all duration-1000", usagePercent < 20 ? "bg-red-600" : "bg-emerald-500")} 
                              style={{ width: `${usagePercent}%` }} 
                            />
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3">
                         <button 
                            onClick={() => handleDeploy(lic)} 
                            disabled={lic.avail === 0}
                            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-red-600 text-white text-[9px] font-black rounded-xl transition-all uppercase italic disabled:opacity-30"
                         >
                           Deploy
                         </button>
                         <button onClick={() => { setEditingLicense(lic); setIsModalOpen(true); }} className="p-2.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-white rounded-xl transition-all"><Edit2 size={14} /></button>
                         <button onClick={() => handleDelete(lic)} className="p-2.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-[#0f121d] border border-slate-800 p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-red-600/10 rounded-2xl border border-red-600/20">
            <ShieldCheck className="text-red-600" size={28} />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase italic tracking-tight">Compliance Protocol Active</p>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Audit logs are being recorded for all seat deployments</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Global Seats</p>
            <p className="text-3xl font-black text-white leading-none mt-2 italic tracking-tighter">
              {licenses.reduce((acc: any, curr: any) => acc + (curr.total || 0), 0)}
            </p>
          </div>
          <div className="text-right border-l border-slate-800 pl-8">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Available</p>
            <p className="text-3xl font-black text-emerald-500 leading-none mt-2 italic tracking-tighter">
              {licenses.reduce((acc: any, curr: any) => acc + (curr.avail || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <LicenseModal 
          license={editingLicense} 
          onClose={() => { setIsModalOpen(false); setEditingLicense(null); }} 
          onSave={handleSaveLicense} 
        />
      )}
    </div>
  );
};

export default SoftwareLicenses;
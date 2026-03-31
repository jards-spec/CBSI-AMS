import React, { useState } from 'react';
import { 
  Package, Plus, Search, Filter, MoreVertical, 
  User, Laptop, Monitor, MousePointer, Smartphone, AlertCircle,
  Hash, Zap, Box, DollarSign, Building
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';
import AssetModal from '../components/AssetModal';
import { cn } from '../lib/utils';

interface Asset {
  id: string;
  tag: string;
  name: string;
  category: string;
  status: string;
  assignedTo?: string;
  serialNo: string;
  modelNo: string;
  manufacturer: string;
  unitCost: string;
  location: string;
  purchaseDate: string;
}

const Assets = () => {
  const { addLog } = useAudit();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Initialize from LocalStorage
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('ams_inventory');
    return saved ? JSON.parse(saved) : [
      { 
        id: '1', tag: 'CB-LAP-001', name: 'MacBook Pro M3', 
        category: 'Laptop', status: 'Assigned', 
        assignedTo: 'Clint Perlas', serialNo: 'SN-V3-9921',
        modelNo: 'A2941', manufacturer: 'APPLE', unitCost: '2499',
        location: 'Main Office', purchaseDate: '2026-01-15'
      }
    ];
  });

  const handleSaveAsset = (data: any) => {
    let updatedAssets;
    if (selectedAsset) {
      // Update existing record
      updatedAssets = assets.map(a => a.id === selectedAsset.id ? { ...a, ...data } : a);
      addLog('Update', `Modified Asset: ${data.name} (${selectedAsset.tag})`);
    } else {
      // Create new record with auto-generated Tag
      const newAsset = {
        ...data,
        id: crypto.randomUUID(),
        tag: `CB-${data.category?.toUpperCase().substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      updatedAssets = [newAsset, ...assets];
      addLog('Create', `Registered Asset: ${data.name} [${newAsset.tag}]`);
    }

    setAssets(updatedAssets);
    localStorage.setItem('ams_inventory', JSON.stringify(updatedAssets));
    setIsModalOpen(false);
    setSelectedAsset(null);
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.serialNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusStyles = (status: string) => {
    switch(status) {
      case 'Available': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Assigned': case 'Deployed': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Maintenance': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-800';
    }
  };

  const getIcon = (cat: string) => {
    const c = cat?.toLowerCase();
    if (c?.includes('laptop')) return <Laptop size={18} />;
    if (c?.includes('monitor')) return <Monitor size={18} />;
    if (c?.includes('mobile')) return <Smartphone size={18} />;
    return <Box size={18} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3 italic">
            <Package className="text-red-600" size={28} />
            Asset <span className="text-red-600">Inventory</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
            Management Console // {assets.length} Units Found
          </p>
        </div>
        <button 
          onClick={() => { setSelectedAsset(null); setIsModalOpen(true); }}
          className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/40 italic"
        >
          <Plus size={18} strokeWidth={3} /> Register Asset
        </button>
      </div>

      {/* FILTER STRIP */}
      <div className="bg-[#0f121d] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="FILTER BY NAME, TAG, OR SERIAL..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-4 pl-12 text-[10px] font-black text-white placeholder:text-slate-700 uppercase tracking-[0.2em] focus:border-red-600 outline-none transition-all"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="bg-slate-800/40 p-4 rounded-xl text-slate-500 border border-slate-800 hover:text-white transition-all">
          <Filter size={18} />
        </button>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-[#0f121d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#161b29] border-b border-slate-800">
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Asset Details</th>
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Manufacturer / Model</th>
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
              <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Financials</th>
              <th className="p-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filteredAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-800/20 transition-colors group">
                <td className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-red-500 border border-slate-800 group-hover:border-red-600/50 transition-all shadow-inner">
                      {getIcon(asset.category)}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase italic tracking-tight group-hover:text-red-500 transition-colors">{asset.name}</div>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 mt-0.5">
                        <Hash size={10} className="text-slate-700" /> {asset.tag}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                    <Building size={12} className="text-slate-600" /> {asset.manufacturer || 'GENERIC'}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 mt-0.5">{asset.modelNo || 'N/A'}</div>
                </td>
                <td className="p-5">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border inline-block",
                    getStatusStyles(asset.status)
                  )}>
                    {asset.status}
                  </span>
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 italic">
                    <DollarSign size={12} /> {Number(asset.unitCost || 0).toLocaleString()}
                  </div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase mt-0.5 tracking-tighter italic">Value Estimate</div>
                </td>
                <td className="p-5 text-right">
                  <button 
                    onClick={() => { setSelectedAsset(asset); setIsModalOpen(true); }}
                    className="p-2 text-slate-600 hover:text-white transition-colors bg-slate-900/50 rounded-lg border border-slate-800 hover:border-red-600/50 shadow-sm"
                  >
                    <MoreVertical size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAssets.length === 0 && (
          <div className="py-24 text-center">
            <AlertCircle className="mx-auto text-slate-800 mb-4" size={40} />
            <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[10px]">Registry Empty // No Matching Units</p>
          </div>
        )}
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0f121d] border border-slate-800 p-5 rounded-2xl flex items-center justify-between group">
          <div>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em]">Total Units</p>
            <p className="text-2xl font-black text-white italic">{assets.length}</p>
          </div>
          <div className="p-3 bg-red-600/10 rounded-xl border border-red-600/20">
            <Package size={20} className="text-red-600" />
          </div>
        </div>
        <div className="bg-[#0f121d] border border-slate-800 p-5 rounded-2xl flex items-center justify-between group">
          <div>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em]">Active Sessions</p>
            <p className="text-2xl font-black text-emerald-500 italic">SECURE</p>
          </div>
          <div className="p-3 bg-emerald-600/10 rounded-xl border border-emerald-600/20">
            <Zap size={20} className="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* RENDER MODAL */}
      {isModalOpen && (
        <AssetModal 
          asset={selectedAsset} 
          onClose={() => { setIsModalOpen(false); setSelectedAsset(null); }} 
          onSave={handleSaveAsset} 
        />
      )}
    </div>
  );
};

export default Assets;
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, User, Laptop, Monitor, Server, Smartphone, Plus, X, 
  Edit2, Archive, Shield, FileText, Upload, Printer, Calendar, DollarSign, Download, Maximize2, Package 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTransaction } from '../hooks/useTransaction';
import { useAudit } from '../hooks/useAudit'; 
import AssetCheckoutModal from '../components/AssetCheckoutModal';
import AssetCheckinModal from '../components/AssetCheckinModal';

const Inventory = () => {
  const { addLog } = useAudit(); 
  const { checkinItem, checkoutItem } = useTransaction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<any[]>(() => {
    const saved = localStorage.getItem('ams_assets');
    return saved ? JSON.parse(saved) : [];
  });
  const [employees] = useState<any[]>(() => JSON.parse(localStorage.getItem('ams_employees') || '[]'));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<'checkout' | 'checkin' | 'add' | 'edit' | 'view' | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    tag: '', model: '', serial: '', category: 'Laptop', 
    purchaseDate: new Date().toISOString().split('T')[0], 
    purchaseCost: '', warrantyMonths: 12, receipt: '' as string | null
  });

  useEffect(() => {
    localStorage.setItem('ams_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    if (modalMode === 'add') {
      setFormData({ 
        tag: generateNextTag(), model: '', serial: '', category: 'Laptop', 
        purchaseDate: new Date().toISOString().split('T')[0], purchaseCost: '', 
        warrantyMonths: 12, receipt: null 
      });
    } else if (modalMode === 'edit' && selectedAsset) {
      setFormData({ ...selectedAsset });
    }
  }, [modalMode, selectedAsset]);

  const generateNextTag = () => {
    if (assets.length === 0) return 'AST-001';
    const numericTags = assets.map(a => parseInt(a.tag?.match(/\d+/)?.[0] || '0', 10));
    return `AST-${(Math.max(...numericTags) + 1).toString().padStart(3, '0')}`;
  };

  const handleDownload = (url: string, filename: string) => {
    addLog('INFO', selectedAsset?.tag, `Downloaded official receipt.`);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'add') {
      const newAsset = { ...formData, id: `ID-${Date.now()}`, status: 'Ready to Deploy', assignedTo: null };
      setAssets(prev => [newAsset, ...prev]);
      addLog('ADDED', formData.tag, `Registered ${formData.category}: ${formData.model}`);
    } else {
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, ...formData } : a));
      addLog('UPDATED', formData.tag, `Modified asset specifications.`);
    }
    setModalMode(null);
  };

  const handleArchive = (asset: any) => {
    setAssets(prev => prev.map(a => a.id === asset.id ? {...a, status: 'Archived'} : a));
    addLog('DELETED', asset.tag, `Asset moved to archives.`);
  };

  const handleCheckoutConfirm = (details: any) => {
    const updatedAssets = checkoutItem(selectedAsset, 'assets', details);
    setAssets(updatedAssets);
    setModalMode(null);
  };

  const handleCheckinConfirm = (details: any) => {
    const updatedAssets = checkinItem(selectedAsset, 'assets', details);
    setAssets(updatedAssets);
    setModalMode(null);
  };

  const filteredAssets = useMemo(() => 
    assets.filter(a => a.status !== 'Archived' && (a.tag+a.model).toLowerCase().includes(searchQuery.toLowerCase())), 
  [assets, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <div className="flex justify-between items-end border-b border-slate-800/50 pb-6">
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">Hardware <span className="text-red-600">Inventory</span></h1>
        <div className="flex gap-3">
          <input type="text" placeholder="SEARCH..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#0f121d] border border-slate-800 rounded-lg px-4 py-2 text-[10px] text-white outline-none font-bold focus:border-red-600 uppercase" />
          <button onClick={() => setModalMode('add')} className="bg-red-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-700 transition-colors"><Plus size={14} /> Add Asset</button>
        </div>
      </div>

      <div className="bg-[#0f121d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="bg-[#161b29] border-b border-slate-800 font-black text-slate-500 uppercase tracking-widest">
              <th className="px-6 py-5">Asset Tag</th>
              <th className="px-6 py-5">Model / Serial</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filteredAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-white/[0.02] group transition-colors">
                <td className="px-6 py-4">
                  <button 
                    onClick={() => { setSelectedAsset(asset); setModalMode('view'); }}
                    className="font-mono font-black text-red-500 text-xs hover:underline decoration-2 underline-offset-4 uppercase tracking-tighter"
                  >
                    {asset.tag}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="text-white font-bold uppercase">{asset.model}</div>
                  <div className="text-slate-600 text-[8px] font-bold uppercase italic">S/N: {asset.serial || 'N/A'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block", asset.status === 'Deployed' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")}>{asset.status}</div>
                  {asset.assignedTo && <div className="text-[8px] text-slate-500 font-bold mt-1 uppercase flex items-center gap-1"><User size={8} className="text-red-600" /> {asset.assignedTo}</div>}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setSelectedAsset(asset); setModalMode('edit'); }} className="p-2 bg-slate-800 text-[#3c8dbc] rounded hover:bg-slate-700 transition-colors"><Edit2 size={12} /></button>
                    <button onClick={() => handleArchive(asset)} className="p-2 bg-slate-800 text-red-500 rounded hover:bg-red-900/30 transition-colors"><Archive size={12} /></button>
                    
                    {asset.status === 'Deployed' ? (
                      <button onClick={() => { setSelectedAsset(asset); setModalMode('checkin'); }} className="bg-[#3c8dbc] hover:bg-[#367fa9] text-white px-4 py-1.5 rounded font-bold uppercase text-[9px] transition-all ml-2">Check-in</button>
                    ) : (
                      <button onClick={() => { setSelectedAsset(asset); setModalMode('checkout'); }} className="bg-[#00a65a] hover:bg-[#008d4c] text-white px-4 py-1.5 rounded font-bold uppercase text-[9px] transition-all ml-2 shadow-lg shadow-emerald-900/20">Checkout</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL: VIEW ASSET DETAILS --- */}
      {modalMode === 'view' && selectedAsset && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f121d] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-[#161b29] flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="bg-red-600 text-white px-3 py-1 rounded font-mono font-black text-sm italic">{selectedAsset.tag}</span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Asset <span className="text-red-600">Passport</span></h3>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Specifications</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-400 font-bold uppercase text-[10px]">Model</span><span className="text-white font-black uppercase text-[10px]">{selectedAsset.model}</span></div>
                    <div className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-400 font-bold uppercase text-[10px]">Serial</span><span className="text-white font-mono font-black text-[10px]">{selectedAsset.serial || 'N/A'}</span></div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Official Receipt</label>
                {selectedAsset.receipt ? (
                  <div className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-[3/4] bg-[#161b29] flex flex-col">
                    <img src={selectedAsset.receipt} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="Receipt" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                      <button onClick={() => setShowPdfPreview(true)} className="bg-white text-black px-5 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-2xl hover:bg-red-600 hover:text-white transition-colors"><Maximize2 size={16}/> View Full Doc</button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-800 aspect-[3/4] flex flex-col items-center justify-center text-slate-700 italic text-[10px] font-black uppercase">No Document</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FULLSCREEN DOCUMENT VIEWER --- */}
      {showPdfPreview && selectedAsset?.receipt && (
        <div className="fixed inset-0 z-[1000] bg-black/98 flex flex-col">
          <div className="p-4 bg-[#161b29] border-b border-slate-800 flex justify-between items-center">
            <h4 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2"><FileText size={14} className="text-red-600"/> {selectedAsset.tag} - RECEIPT</h4>
            <div className="flex items-center gap-3">
              <button onClick={() => handleDownload(selectedAsset.receipt, `${selectedAsset.tag}_Receipt.png`)} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700"><Download size={20} /></button>
              <button onClick={() => setShowPdfPreview(false)} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"><X size={20} /></button>
            </div>
          </div>
          <div className="flex-1 bg-[#0a0c14] flex items-center justify-center">
            <iframe src={selectedAsset.receipt} className="w-[90%] h-[90%] border border-slate-800 rounded-lg shadow-2xl" title="Receipt Viewer"/>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f121d] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-[#161b29] flex justify-between items-center">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{modalMode === 'add' ? 'Register' : 'Edit'} <span className="text-red-600">Asset</span></h3>
              <button onClick={() => setModalMode(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase">Tag</label>
                  <input readOnly value={formData.tag} className="w-full bg-[#161b29]/50 border border-slate-800 rounded-lg px-4 py-3 text-red-500 font-mono font-black" />
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-[#161b29] border border-slate-800 rounded-lg px-4 py-3 text-white font-black uppercase outline-none focus:border-red-600">
                    <option>Laptop</option><option>Desktop</option><option>Servers</option><option>Mobile</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase">Identification</label>
                <input required placeholder="Model Name" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} className="w-full bg-[#161b29] border border-slate-800 rounded-lg px-4 py-3 text-white font-bold uppercase mb-2 outline-none focus:border-red-600" />
                <input placeholder="Serial Number" value={formData.serial} onChange={(e) => setFormData({...formData, serial: e.target.value})} className="w-full bg-[#161b29] border border-slate-800 rounded-lg px-4 py-3 text-white font-mono outline-none focus:border-red-600" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase">Purchased</label>
                  <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})} className="w-full bg-[#161b29] border border-slate-800 rounded-lg px-4 py-3 text-white font-bold text-[10px]" />
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase">Cost (USD)</label>
                  <input type="number" step="0.01" value={formData.purchaseCost} onChange={(e) => setFormData({...formData, purchaseCost: e.target.value})} className="w-full bg-[#161b29] border border-slate-800 rounded-lg px-4 py-3 text-white font-bold" />
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase">Warranty (Mo)</label>
                  <input type="number" value={formData.warrantyMonths} onChange={(e) => setFormData({...formData, warrantyMonths: Number(e.target.value)})} className="w-full bg-[#161b29] border border-slate-800 rounded-lg px-4 py-3 text-white font-bold" />
                </div>
              </div>
              <div className="pt-2">
                <label className="text-[9px] font-black text-slate-500 uppercase">Receipt Attachment</label>
                <div onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-colors">
                  <input type="file" ref={fileInputRef} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, receipt: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="hidden" accept="image/*" />
                  {formData.receipt ? <div className="text-emerald-500 font-black text-[10px] uppercase flex items-center gap-2"><FileText size={18} /> Document Linked</div> : <div className="text-slate-600 font-black text-[10px] uppercase italic flex flex-col items-center"><Upload size={18} className="mb-1" /> Click to Upload Receipt</div>}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalMode(null)} className="flex-1 py-4 rounded-xl border border-slate-800 text-slate-500 font-black uppercase text-[10px] hover:bg-slate-800 transition-colors">Discard</button>
                <button type="submit" className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SNIPE-IT CHECKOUT MODAL --- */}
      <AssetCheckoutModal 
        isOpen={modalMode === 'checkout'} 
        onClose={() => setModalMode(null)} 
        item={selectedAsset} 
        employees={employees} 
        onConfirm={handleCheckoutConfirm} 
      />

      {/* --- SNIPE-IT CHECK-IN MODAL --- */}
      <AssetCheckinModal 
        isOpen={modalMode === 'checkin'} 
        onClose={() => setModalMode(null)} 
        item={selectedAsset} 
        onConfirm={handleCheckinConfirm} 
      />
    </div>
  );
};

export default Inventory;
import React, { useState } from 'react';
import { X, Calendar, User, Package, MapPin } from 'lucide-react';

export default function AssetCheckoutModal({ isOpen, onClose, item, employees, onConfirm }: any) {
  const [checkoutTarget, setCheckoutTarget] = useState<'user' | 'asset' | 'location'>('user');
  const [formData, setFormData] = useState({
    user: '',
    checkoutDate: new Date().toISOString().split('T')[0],
    expectedCheckin: '',
    notes: '',
    status: 'Ready to Deploy'
  });

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-black/80 flex items-start justify-center pt-10 px-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-[#222d32] w-full max-w-4xl shadow-2xl rounded-t-md overflow-hidden mb-10 animate-in zoom-in-95">
        
        {/* Teal Header */}
        <div className="bg-[#00c0ef] text-white px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            Assets > {item.tag} ({item.model}) > Checkout Asset
          </h2>
          <button onClick={onClose} className="hover:text-black/30 transition-colors"><X size={20} /></button>
        </div>

        {/* Green Banner */}
        <div className="bg-[#00a65a] text-white px-4 py-2 text-[11px] font-bold">
          SYSTEM MODE: Active Asset Tracking.
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onConfirm({ ...formData, checkoutTarget }); }} className="p-6 text-sm text-slate-300">
          <div className="grid grid-cols-[220px_1fr] gap-y-5 items-center">
            
            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px]">Asset Tag</div>
            <div className="font-bold text-white">{item.tag}</div>

            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px]">Category</div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3 h-3 bg-blue-500 inline-block"></span> {item.category || 'Desktops'}
            </div>

            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px]">Model</div>
            <div className="text-slate-200 font-bold">{item.model}</div>

            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px]">Status</div>
            <div className="max-w-md">
               <select 
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="bg-[#1e282c] border border-[#3c8dbc] text-white p-2 w-full rounded focus:outline-none focus:ring-1 focus:ring-white"
              >
                <option>Ready to Deploy</option>
                <option>Pending</option>
              </select>
            </div>

            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px]">Checkout to</div>
            <div className="flex bg-[#1e282c] w-fit rounded overflow-hidden border border-slate-700">
              <button 
                type="button" 
                onClick={() => setCheckoutTarget('user')} 
                className={`px-4 py-2 flex items-center gap-2 transition-colors text-[11px] font-bold uppercase ${checkoutTarget === 'user' ? 'bg-[#3c8dbc] text-white' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                <User size={12}/> User
              </button>
              <button 
                type="button" 
                onClick={() => setCheckoutTarget('asset')} 
                className={`px-4 py-2 flex items-center gap-2 transition-colors text-[11px] font-bold uppercase ${checkoutTarget === 'asset' ? 'bg-[#3c8dbc] text-white' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                <Package size={12}/> Asset
              </button>
              <button 
                type="button" 
                onClick={() => setCheckoutTarget('location')} 
                className={`px-4 py-2 flex items-center gap-2 transition-colors text-[11px] font-bold uppercase ${checkoutTarget === 'location' ? 'bg-[#3c8dbc] text-white' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                <MapPin size={12}/> Location
              </button>
            </div>

            <div className="text-right pr-6 font-bold text-white uppercase text-[10px]">Selected User</div>
            <div className="flex gap-2 max-w-md">
              <select 
                required 
                onChange={(e) => setFormData({...formData, user: e.target.value})} 
                className="bg-[#1e282c] border border-slate-700 text-white p-2 flex-1 rounded focus:outline-none focus:border-[#3c8dbc]"
              >
                <option value="">Select a User</option>
                {employees.map((emp: any) => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
              </select>
              <button type="button" className="bg-[#3c8dbc] px-4 rounded font-bold text-white text-[10px] hover:bg-[#367fa9] uppercase">New</button>
            </div>

            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px]">Checkout Date</div>
            <div className="flex max-w-md">
              <input 
                type="date" 
                value={formData.checkoutDate} 
                onChange={(e) => setFormData({...formData, checkoutDate: e.target.value})} 
                className="bg-[#1e282c] border border-slate-700 text-white p-2 flex-1 focus:outline-none focus:border-[#3c8dbc]" 
              />
              <div className="bg-[#eee] text-black p-2 border border-[#ccc] rounded-r"><Calendar size={16}/></div>
            </div>

            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px]">Expected Checkin</div>
            <div className="flex max-w-md">
              <input 
                type="date" 
                value={formData.expectedCheckin} 
                onChange={(e) => setFormData({...formData, expectedCheckin: e.target.value})} 
                className="bg-[#1e282c] border border-slate-700 text-white p-2 flex-1 focus:outline-none focus:border-[#3c8dbc]" 
              />
              <div className="bg-[#eee] text-black p-2 border border-[#ccc] rounded-r"><Calendar size={16}/></div>
            </div>

            <div className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px] self-start pt-2">Notes</div>
            <div className="max-w-md">
              <textarea 
                rows={3} 
                onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                className="bg-[#1e282c] border border-slate-700 border-r-[6px] border-r-[#f39c12] text-white p-2 w-full rounded focus:outline-none focus:border-[#3c8dbc]" 
                placeholder="Notes regarding this checkout..."
              />
            </div>
          </div>

          <div className="mt-8 bg-[#00c0ef] text-white p-3 rounded font-bold text-[11px] space-y-1">
            <div className="flex items-center gap-2"><input type="checkbox" defaultChecked /> This user will be emailed with a link to confirm acceptance of this item.</div>
            <div className="flex items-center gap-2"><input type="checkbox" defaultChecked /> This user will be emailed a copy of the EULA.</div>
          </div>

          <div className="mt-8 flex justify-between items-center border-t border-slate-700 pt-6">
            <button type="button" onClick={onClose} className="text-[#3c8dbc] hover:underline font-bold uppercase text-xs">Cancel</button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="bg-[#444] hover:bg-[#555] text-white px-4 py-2 rounded text-xs font-bold uppercase">Return to all Assets</button>
              <button type="submit" className="bg-[#00a65a] hover:bg-[#008d4c] text-white px-8 py-2 rounded font-bold flex items-center gap-2 text-xs uppercase shadow-lg shadow-emerald-900/40 transition-colors">
                ✓ Checkout
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
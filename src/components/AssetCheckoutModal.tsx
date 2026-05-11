import React, { useState, useMemo } from 'react';
import { X, User, Box, Calendar, Check, Search, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  employees: any[];
  assets?: any[];
  onConfirm: (details: any) => void;
}

const AssetCheckoutModal: React.FC<Props> = ({ isOpen, onClose, item, employees, assets, onConfirm }) => {
  const [checkoutTo, setCheckoutTo] = useState<'user' | 'asset'>('user');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedCheckinDate, setExpectedCheckinDate] = useState('');
  const [notes, setNotes] = useState('');

  // SEARCH LOGIC - Fixed 'undefined' crash by checking assets prop
  const filteredOptions = useMemo(() => {
    if (checkoutTo === 'user') {
      return (employees || []).filter(emp => 
        (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return (assets || []).filter(a => 
        ((a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.tag || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
        a.id !== item?.id
      );
    }
  }, [searchTerm, checkoutTo, employees, assets, item]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-md animate-in fade-in zoom-in duration-200">
      <div className="bg-[#0f121d] border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border-t-4 border-t-[#d946ef] flex flex-col max-h-[95vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#161b29]">
          <div>
            <h2 className="text-white font-black uppercase italic tracking-tighter text-lg">
              Asset Tag <span className="text-[#d946ef]">{item?.tag || 'N/A'}</span>
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Name: <span className="text-white">{item?.name}</span></span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Category: <span className="text-pink-500">{item?.category}</span></span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Model: <span className="text-white">{item?.modelNo || 'N/A'}</span></span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status: <span className="text-emerald-500">{item?.status}</span></span>
            </div>
          </div>
          <button onClick={onClose} type="button" className="text-slate-500 hover:text-white transition-colors p-2">
            <X size={20} />
          </button>
        </div>

        {/* FORM BODY */}
        <div className="p-8 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* CHECKOUT TO TOGGLE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Checkout To</label>
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
              <button 
                type="button"
                onClick={() => { setCheckoutTo('user'); setSelectedTarget(''); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${checkoutTo === 'user' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <User size={14} /> User
              </button>
              <button 
                type="button"
                onClick={() => { setCheckoutTo('asset'); setSelectedTarget(''); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${checkoutTo === 'asset' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Box size={14} /> Asset
              </button>
            </div>
          </div>

          {/* SEARCHABLE DROPDOWN */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">
              {checkoutTo === 'user' ? 'Select Personnel' : 'Select Target Asset'}
            </label>
            <div className="relative group">
              <Search className="absolute left-4 top-4 text-slate-600 group-focus-within:text-[#d946ef] transition-colors" size={16} />
              <input 
                type="text"
                placeholder={checkoutTo === 'user' ? "SEARCH EMPLOYEES..." : "SEARCH ASSETS BY NAME OR TAG..."}
                className="w-full bg-slate-900 border border-slate-800 rounded-t-xl p-4 pl-12 text-[10px] font-black text-white outline-none focus:border-[#d946ef] uppercase tracking-widest placeholder:text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="bg-slate-900/80 border-x border-b border-slate-800 max-h-40 overflow-y-auto rounded-b-xl scrollbar-thin scrollbar-thumb-slate-700">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        const val = checkoutTo === 'user' ? option.name : option.tag;
                        setSelectedTarget(val);
                        setSearchTerm(val);
                      }}
                      className={`w-full text-left p-3 text-[10px] font-bold uppercase transition-all flex justify-between items-center border-b border-slate-800/30 last:border-0 ${
                        selectedTarget === (option.name || option.tag) ? 'bg-pink-600/20 text-pink-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <span>{option.name}</span>
                      <span className="text-[8px] opacity-40 italic">{checkoutTo === 'user' ? option.department : option.tag}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-[9px] text-slate-600 text-center font-black italic">NO MATCHES FOUND</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Checkout Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input 
                  type="date"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-3 text-white text-[10px] font-black outline-none focus:border-[#d946ef]"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Expected Checkin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input 
                  type="date"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-3 text-white text-[10px] font-black outline-none focus:border-[#d946ef]"
                  value={expectedCheckinDate}
                  onChange={(e) => setExpectedCheckinDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Notes</label>
            <textarea 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-[10px] font-bold outline-none focus:border-[#d946ef] min-h-20 resize-none uppercase"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ENTER ADDITIONAL DETAILS..."
            />
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-tight leading-relaxed">
              Notice: This user will be emailed with a link to confirm acceptance of this item.
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="p-6 border-t border-slate-800 bg-[#161b29] flex justify-between items-center">
          <button 
            type="button"
            onClick={onClose} 
            className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors italic"
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={!selectedTarget}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm({ selectedTarget, checkoutTo, checkoutDate, expectedCheckinDate, notes });
            }}
            className="bg-emerald-600 px-10 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40 active:scale-95 transition-all italic disabled:opacity-30 disabled:grayscale"
          >
            <Check size={16} strokeWidth={3} /> Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetCheckoutModal;

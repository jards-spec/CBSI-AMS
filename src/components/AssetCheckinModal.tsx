import React, { useState } from 'react';
import { X, RefreshCcw, MapPin, Calendar, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onConfirm: (details: any) => void;
}

const AssetCheckinModal: React.FC<Props> = ({ isOpen, onClose, item, onConfirm }) => {
  // Fields mapped exactly from your screenshot
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState('');
  const [locationUpdateType, setLocationUpdateType] = useState('actual'); // 'actual' vs 'both'
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-md animate-in fade-in zoom-in duration-200">
      <div className="bg-[#0f121d] border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border-t-4 border-t-emerald-500 flex flex-col max-h-[95vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#161b29]">
          <div>
            <h2 className="text-white font-black uppercase italic tracking-tighter text-lg">
              Asset Tag <span className="text-emerald-500">{item?.tag || '1558811774'}</span>
            </h2>
            <div className="flex gap-4 mt-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Category: <span className="text-emerald-500">{item?.category || 'Desktops'}</span></span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Model: <span className="text-white">{item?.name || 'iMac Pro'}</span></span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2">
            <X size={20} />
          </button>
        </div>

        {/* FORM BODY */}
        <div className="p-8 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* ASSET NAME (READ ONLY / AS SHOWN IN SCREENSHOT) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Name</label>
            <input 
              disabled
              className="w-full bg-slate-900/30 border border-slate-800/50 rounded-xl p-3 text-slate-500 text-[10px] font-black uppercase outline-none cursor-not-allowed"
              value={item?.name || ''}
            />
          </div>

          {/* STATUS SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Status</label>
            <select 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-[10px] font-black uppercase outline-none focus:border-emerald-500 appearance-none cursor-pointer"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Select Status</option>
              <option value="Ready to Deploy">Ready to Deploy</option>
              <option value="Pending">Pending</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* LOCATION SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Location</label>
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-[10px] font-black uppercase outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Select a Location</option>
                <option value="Main Office">Main Office</option>
                <option value="Storage A">Storage A</option>
              </select>
              <button className="bg-blue-600 px-4 rounded-xl text-[10px] font-black text-white uppercase hover:bg-blue-500 transition-colors">New</button>
            </div>
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tight">
              You can choose to check this asset in to a location other than this asset's default location.
            </p>
          </div>

          {/* LOCATION UPDATE RADIOS */}
          <div className="space-y-3 py-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="radio" 
                className="hidden" 
                name="locUpdate" 
                checked={locationUpdateType === 'actual'} 
                onChange={() => setLocationUpdateType('actual')}
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${locationUpdateType === 'actual' ? 'border-emerald-500' : 'border-slate-700'}`}>
                {locationUpdateType === 'actual' && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Update Asset Location</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="radio" 
                className="hidden" 
                name="locUpdate" 
                checked={locationUpdateType === 'both'} 
                onChange={() => setLocationUpdateType('both')}
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${locationUpdateType === 'both' ? 'border-emerald-500' : 'border-slate-700'}`}>
                {locationUpdateType === 'both' && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Update default location AND actual location</span>
            </label>
          </div>

          {/* CHECKIN DATE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Checkin Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                type="date"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-3 text-white text-[10px] font-black outline-none focus:border-emerald-500"
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
              />
            </div>
          </div>

          {/* NOTES */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.2em]">Notes</label>
            <textarea 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-[10px] font-bold outline-none focus:border-emerald-500 min-h-20 resize-none uppercase"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="p-6 border-t border-slate-800 bg-[#161b29] flex justify-between items-center">
          <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors italic">Cancel</button>
          <div className="flex gap-3">
            <button className="bg-slate-800 px-6 py-3 rounded-xl text-[10px] font-black text-white uppercase hover:bg-slate-700 transition-all italic">Return to all Assets</button>
            <button 
              onClick={() => onConfirm({ status, location, locationUpdateType, checkinDate, notes })}
              className="bg-emerald-600 px-10 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40 active:scale-95 transition-all italic"
            >
              <Check size={16} strokeWidth={3} /> Checkin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetCheckinModal;


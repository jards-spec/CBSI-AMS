import React, { useState, useEffect } from 'react';
import { X, Wrench } from 'lucide-react';

interface Props {
  ticket?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const MaintenanceModal: React.FC<Props> = ({ ticket, onClose, onSave }) => {
  const isEditing = !!ticket;

  const [formData, setFormData] = useState({
    assetName: '',
    issue: '',
    status: 'Pending',
    priority: 'Medium',
    cost: 0,
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (ticket) setFormData(ticket);
  }, [ticket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0f121d] border border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 flex justify-between items-center border-b border-slate-800/50">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">
            {isEditing ? 'Update Ticket' : 'Log Maintenance'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form className="p-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Name</label>
            <input 
              type="text" required value={formData.assetName}
              onChange={(e) => setFormData({...formData, assetName: e.target.value})}
              className="w-full bg-[#05070a] border border-slate-800/50 rounded-xl p-3 text-slate-300 outline-none focus:border-red-500/50" 
              placeholder="e.g. MacBook Pro (SN-123)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description of Issue</label>
            <textarea 
              required value={formData.issue}
              onChange={(e) => setFormData({...formData, issue: e.target.value})}
              className="w-full bg-[#05070a] border border-slate-800/50 rounded-xl p-3 text-slate-300 outline-none focus:border-red-500/50 h-24 resize-none" 
              placeholder="Describe the fault..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none cursor-pointer"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Priority</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 hover:text-white">Cancel</button>
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all">
              Save Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;


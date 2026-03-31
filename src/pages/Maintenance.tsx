import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Search, Edit2, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAudit } from '../context/AuditContext';
import MaintenanceModal from '../components/MaintenanceModal';

const DEFAULT_TICKETS = [
  { id: 1, assetName: 'Dell Monitor U27', issue: 'Backlight flickering', status: 'In Progress', priority: 'Medium', startDate: '2026-03-20' },
  { id: 2, assetName: 'MacBook Pro 14"', issue: 'Keyboard replacement', status: 'Pending', priority: 'High', startDate: '2026-03-24' }
];

const Maintenance = () => {
  const { addLog } = useAudit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // PERSISTENCE
  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('ams_maintenance');
    return saved ? JSON.parse(saved) : DEFAULT_TICKETS;
  });

  useEffect(() => {
    localStorage.setItem('ams_maintenance', JSON.stringify(tickets));
  }, [tickets]);

  const handleSave = (formData: any) => {
    if (editingTicket) {
      setTickets(prev => prev.map(t => t.id === editingTicket.id ? { ...t, ...formData } : t));
      addLog('UPDATED', formData.assetName, 'MAINTENANCE', `Repair status changed to ${formData.status}`);
    } else {
      const newTicket = { ...formData, id: Date.now() };
      setTickets(prev => [newTicket, ...prev]);
      addLog('ADDED', formData.assetName, 'MAINTENANCE', `Maintenance log created for ${formData.issue}`);
    }
    setIsModalOpen(false);
    setEditingTicket(null);
  };

  const handleDelete = (ticket: any) => {
    if (window.confirm(`Delete maintenance record for ${ticket.assetName}?`)) {
      setTickets(prev => prev.filter(t => t.id !== ticket.id));
      addLog('DELETED', ticket.assetName, 'MAINTENANCE', `Maintenance record removed`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Maintenance Logs</h1>
          <p className="text-slate-500 text-sm">Tracking active repairs and hardware health.</p>
        </div>
        
        <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-lg shadow-red-600/20 active:scale-95 transition-all">
          <Plus size={18} /> New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tickets.map((ticket: any) => (
          <div key={ticket.id} className="bg-[#0f121d] border border-slate-800/60 rounded-2xl p-6 flex items-center justify-between group hover:border-slate-700 transition-all">
            <div className="flex items-center gap-6">
              <div className={cn(
                "p-4 rounded-2xl",
                ticket.status === 'Completed' ? "bg-emerald-500/10 text-emerald-500" : 
                ticket.status === 'In Progress' ? "bg-blue-500/10 text-blue-500" : "bg-orange-500/10 text-orange-500"
              )}>
                {ticket.status === 'Completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white">{ticket.assetName}</h3>
                <p className="text-sm text-slate-500 italic">{ticket.issue}</p>
                <div className="flex items-center gap-3 mt-2">
                   <span className={cn(
                     "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                     ticket.priority === 'High' ? "bg-red-500/10 text-red-500" : "bg-slate-800 text-slate-400"
                   )}>
                     {ticket.priority} Priority
                   </span>
                   <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Logged: {ticket.startDate}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setEditingTicket(ticket); setIsModalOpen(true); }} className="p-2 text-slate-500 hover:text-white transition-colors"><Edit2 size={18} /></button>
              <button onClick={() => handleDelete(ticket)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && <MaintenanceModal ticket={editingTicket} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

export default Maintenance;
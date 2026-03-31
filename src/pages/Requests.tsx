import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, Plus, Trash2, Cpu, HardDrive, Search, Calendar, Filter,
  User, Building2, Layers, CheckCircle, XCircle, Printer, ListFilter, FilePlus, UserCheck, ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAudit } from '../context/AuditContext';
import PrintableRequest from '../components/PrintableRequest';

const DEPT_MANAGER_MAP: Record<string, string> = {
  'Editorial Department': 'Bryan Defita',
  'Creatives Department': 'Cathy Perez',
  'Picturebooks Department': 'Nitz Vilante',
  'Yearbooks Department': 'Ronnie Fallado',
  'Production Department': 'Jigz Puraz',
  'Accounting Department': 'Julie Ann Villanueva',
  'MIS Department': 'Walter Del Rosario',
  'E-Commerce Department': 'Lorenz Bio',
  'Warehouse Department': 'Ricky Bernardo',
  'Human Resources': 'Ruth Octaviano',
  'Admin': 'Wilbert Limen',
  'Maintenance Department': 'Wilbert Limen',
  'POD Department': 'Jigz Puraz',
  'Legal Materials': 'Girlie Jacala (AVP)'
};

const EXECUTIVES = [
  { name: 'Mr. Paolo M. Sibal', title: 'President' },
  { name: 'Mr. Carlos M. Sibal', title: 'VP of Operations' },
  { name: 'Mr. Robby M. Sibal', title: 'VP of Marketing' }
];

const DEPARTMENTS = Object.keys(DEPT_MANAGER_MAP);
const DEVICE_TYPES = ['Desktop', 'Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam'];

const Requests = ({ userRole = 'Superuser' }: { userRole?: string }) => {
  const { addLog } = useAudit();
  
  const [allRequests, setAllRequests] = useState<any[]>(() => {
    const saved = localStorage.getItem('ams_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<'form' | 'list'>(userRole === 'Superuser' ? 'list' : 'form');
  const [activePrintRequest, setActivePrintRequest] = useState<any>(null);
  const [approvingExecs, setApprovingExecs] = useState<Record<number, typeof EXECUTIVES[0]>>({});
  
  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // GENERATE MONTH OPTIONS FOR FILTER (FIXED WITH OPTIONAL CHAINING)
  const monthOptions = useMemo(() => {
    const options = new Set<string>();
    allRequests.forEach(req => {
      if (req.dateSubmitted) {
        const dateParts = req.dateSubmitted.split(' ');
        if (dateParts.length >= 3) {
          options.add(`${dateParts[0]} ${dateParts[2]}`);
        }
      }
    });
    return Array.from(options);
  }, [allRequests]);

  // COMBINED FILTER LOGIC (FIXED TO HANDLE UNDEFINED DATES)
  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      const matchesSearch = 
        (req.requestNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (req.requestorName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (req.department?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const dateParts = (req.dateSubmitted || '').split(' ');
      const reqMonthYear = dateParts.length >= 3 ? `${dateParts[0]} ${dateParts[2]}` : 'Unknown';
      const matchesDate = dateFilter === '' || reqMonthYear === dateFilter;

      const matchesStatus = statusFilter === '' || req.status === statusFilter;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [allRequests, searchQuery, dateFilter, statusFilter]);

  const pendingCount = useMemo(() => 
    allRequests.filter(r => r.status === 'Pending').length, 
  [allRequests]);

  useEffect(() => {
    localStorage.setItem('ams_requests', JSON.stringify(allRequests));
  }, [allRequests]);

  const [requestor, setRequestor] = useState({ name: '', department: '', manager: '' });
  const [items, setItems] = useState([
    { id: Date.now(), type: 'Desktop', customType: '', processor: '', ram: '', quantity: 1 }
  ]);

  const handleDepartmentChange = (dept: string) => {
    setRequestor({
      ...requestor,
      department: dept,
      manager: DEPT_MANAGER_MAP[dept] || ''
    });
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), type: 'Desktop', customType: '', processor: '', ram: '', quantity: 1 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'type' && value !== 'Desktop' && value !== 'Laptop') {
          updatedItem.processor = 'N/A';
          updatedItem.ram = 'N/A';
        } else if (field === 'type' && (value === 'Desktop' || value === 'Laptop')) {
          updatedItem.processor = '';
          updatedItem.ram = '';
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRequest = {
      id: Date.now(),
      requestNumber: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      requestorName: requestor.name,
      department: requestor.department,
      managerName: requestor.manager,
      dateSubmitted: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      items: items,
      status: 'Pending'
    };

    setAllRequests([newRequest, ...allRequests]);
    addLog('REQUESTED', requestor.name, 'ASSET', `Submitted ${newRequest.requestNumber}`);
    setItems([{ id: Date.now(), type: 'Desktop', customType: '', processor: '', ram: '', quantity: 1 }]);
    setRequestor({ name: '', department: '', manager: '' });
    if (userRole === 'Superuser') setView('list');
  };

  const handleStatusUpdate = (id: number, newStatus: 'Approved' | 'Rejected') => {
    setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
  };

  const openPrintPreview = (req: any) => {
    const selectedExec = approvingExecs[req.id] || EXECUTIVES[0];
    setActivePrintRequest({ ...req, approvingExecutive: selectedExec });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
            {view === 'form' ? 'Asset Requisition' : 'Request Management'}
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Central Books Asset Management</p>
        </div>
        
        {userRole === 'Superuser' && (
          <div className="flex bg-[#0f121d] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
            <button onClick={() => setView('form')} className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2", view === 'form' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-500 hover:text-white")}>
              <FilePlus size={14} /> New Form
            </button>
            <button onClick={() => setView('list')} className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 relative", view === 'list' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-500 hover:text-white")}>
              <ListFilter size={14} /> Request List
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-red-600 animate-pulse">{pendingCount}</span>}
            </button>
          </div>
        )}
      </div>

      {view === 'form' ? (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          <div className="bg-[#0f121d] border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><User size={12} /> Full Name</label>
              <input required type="text" value={requestor.name} onChange={(e) => setRequestor({...requestor, name: e.target.value})} placeholder="Enter name" className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-red-500/50 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Building2 size={12} /> Department</label>
              <select required value={requestor.department} onChange={(e) => handleDepartmentChange(e.target.value)} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-red-500/50 outline-none transition-all">
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><UserCheck size={12} /> Dept Manager</label>
              <input readOnly value={requestor.manager} placeholder="Mapped Manager" className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed" />
            </div>
          </div>

          <div className="space-y-4">
             {items.map((item) => (
                <div key={item.id} className="bg-[#0f121d] border border-slate-800 rounded-2xl p-6 space-y-6 relative shadow-lg">
                  {items.length > 1 && <button type="button" onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Device Type & Notes</label>
                      <div className="flex gap-2">
                        <select value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)} className="bg-[#050505] border border-slate-800 rounded-lg px-3 py-3 text-sm text-white outline-none w-1/3">
                          {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input type="text" placeholder="Notes (Model, etc)..." value={item.customType} onChange={(e) => updateItem(item.id, 'customType', e.target.value)} className="flex-1 bg-[#050505] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white outline-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Layers size={12} /> Quantity</label>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value))} className="w-full bg-[#050505] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white outline-none" />
                    </div>
                  </div>
                </div>
             ))}
             <button type="button" onClick={addItem} className="w-full border-2 border-dashed border-slate-800 rounded-2xl py-4 text-slate-500 font-bold uppercase text-[10px] hover:border-red-500/50 hover:text-red-500 transition-all">+ Add Item Row</button>
          </div>

          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all">
            <Send size={20} /> Submit Formal Request
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {/* CONTROL BAR: SEARCH + DATE + STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="relative md:col-span-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Search by Req #, Name, or Department..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f121d] border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-xs text-white focus:border-red-500 outline-none transition-all shadow-xl font-bold uppercase tracking-wider placeholder:text-slate-600"
              />
            </div>

            <div className="relative md:col-span-3">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-[#0f121d] border border-slate-800 rounded-xl py-3 pl-12 pr-8 text-xs text-white focus:border-red-500 outline-none appearance-none transition-all shadow-xl font-bold uppercase tracking-wider cursor-pointer"
              >
                <option value="">All Dates</option>
                {monthOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            </div>

            <div className="relative md:col-span-3">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0f121d] border border-slate-800 rounded-xl py-3 pl-12 pr-8 text-xs text-white focus:border-red-500 outline-none appearance-none transition-all shadow-xl font-bold uppercase tracking-wider cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="bg-[#0f121d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#161b29] border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-5">Req #</th>
                  <th className="px-6 py-5">Requestor</th>
                  <th className="px-6 py-5">Approval (Sibal Brothers)</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="px-6 py-4 font-mono font-bold text-red-500 text-xs">
                      {req.requestNumber}
                      <div className="text-[8px] text-slate-600 font-bold uppercase mt-1">{req.dateSubmitted || 'No Date'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-white uppercase">{req.requestorName}</div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase">{req.department}</div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="relative w-56 group/select">
                        <select 
                          value={approvingExecs[req.id]?.name || EXECUTIVES[0].name}
                          onChange={(e) => {
                            const exec = EXECUTIVES.find(ex => ex.name === e.target.value);
                            if (exec) setApprovingExecs({ ...approvingExecs, [req.id]: exec });
                          }}
                          className="w-full bg-[#050505] border border-slate-800 rounded-lg py-2 pl-3 pr-8 text-[10px] font-black uppercase text-slate-300 outline-none appearance-none cursor-pointer focus:border-red-600 transition-all"
                        >
                          {EXECUTIVES.map(ex => (
                            <option key={ex.name} value={ex.name}>{ex.name.split(' ').pop()} — {ex.title}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-1 rounded text-[9px] font-black uppercase", req.status === 'Approved' ? "bg-emerald-500/10 text-emerald-500" : req.status === 'Rejected' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500")}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => openPrintPreview(req)} className="p-2 text-slate-500 hover:text-white bg-slate-800 rounded-lg"><Printer size={14} /></button>
                      {req.status === 'Pending' && (
                        <>
                          <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="p-2 text-emerald-500 bg-emerald-500/10 rounded-lg"><CheckCircle size={14} /></button>
                          <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="p-2 text-red-500 bg-red-500/10 rounded-lg"><XCircle size={14} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">
                      No matching requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activePrintRequest && <PrintableRequest request={activePrintRequest} onClose={() => setActivePrintRequest(null)} />}
    </div>
  );
};

export default Requests;
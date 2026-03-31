import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, Shield, Mail, Building2, Briefcase } from 'lucide-react';

interface Props {
  employee?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const EmployeeModal: React.FC<Props> = ({ employee, onClose, onSave }) => {
  const isEditing = !!employee;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: 'User',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        department: employee.department || '',
        role: employee.role || 'User',
      });
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden relative">
        
        {/* HEADER */}
        <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-[#161b29]/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600/10 rounded-2xl border border-red-600/20">
              <UserPlus className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                {isEditing ? 'Modify' : 'Initialize'} <span className="text-red-600">Employee</span>
              </h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5 italic">
                Directory Protocol // Phase 2.1
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-900 border border-slate-800 text-slate-500 hover:text-white rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          
          {/* FULL NAME */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Shield size={12} className="text-red-600" /> Full Identity
            </label>
            <input 
              required
              className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-red-600 transition-all font-bold placeholder:text-slate-800 uppercase"
              placeholder="E.G. CLINT PERLAS"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Mail size={12} className="text-red-600" /> System Proxy (Email)
            </label>
            <input 
              required
              type="email"
              className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-red-600 transition-all font-mono placeholder:text-slate-800"
              placeholder="USER@CENTRALBOOKS.COM"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* DEPARTMENT */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Building2 size={12} className="text-red-600" /> Sector
              </label>
              <div className="relative">
                <select 
                  required
                  className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-white text-[10px] font-black uppercase outline-none focus:border-red-600 transition-all cursor-pointer appearance-none"
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                  <option value="">SELECT SECTOR</option>
                  <option value="IT Department">IT Department</option>
                  <option value="MIS">MIS</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                  <Building2 size={14} />
                </div>
              </div>
            </div>

            {/* ROLE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Briefcase size={12} className="text-red-600" /> Clearance
              </label>
              <div className="relative">
                <select 
                  className="w-full bg-[#05070a] border border-slate-800 rounded-2xl p-4 text-white text-[10px] font-black uppercase outline-none focus:border-red-600 transition-all cursor-pointer appearance-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="User">User</option>
                  <option value="Superuser">Superuser</option>
                  <option value="Admin">Admin</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                  <Briefcase size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col md:flex-row gap-4 pt-8">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-8 py-4 bg-transparent border border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-900 transition-all italic"
            >
              Abort
            </button>
            <button 
              type="submit" 
              className="flex-1 px-8 py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-950/40 hover:bg-red-700 active:scale-95 transition-all italic flex items-center justify-center gap-3"
            >
              <Save size={16} strokeWidth={3} /> {isEditing ? 'Commit Profile' : 'Authorize Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;
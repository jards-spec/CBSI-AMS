import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Mail, Box, Edit2, Trash2, 
  ChevronDown, AlertTriangle, Building2, Users, Briefcase, ShieldCheck 
} from 'lucide-react';
import { cn } from '../lib/utils';
import EmployeeModal from '../components/EmployeeModal';
import { useAudit } from '../context/AuditContext';

const DEFAULT_EMPLOYEES = [
  { 
    id: 1, 
    name: 'Admin User', 
    department: 'IT', 
    email: 'admin@centralbooks.com', 
    role: 'Superuser', 
    assetsAssigned: 0, 
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=b91c1c&color=fff' 
  },
  { 
    id: 5, 
    name: 'Clint Perlas', 
    department: 'IT Department', 
    email: 'clintperlas@gmail.com', 
    role: 'User', 
    assetsAssigned: 0, 
    avatar: 'https://ui-avatars.com/api/?name=Clint+Perlas&background=334155&color=fff' 
  }
];

const Employees = () => {
  const { addLog } = useAudit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('ams_employees');
    return saved ? JSON.parse(saved) : DEFAULT_EMPLOYEES;
  });

  useEffect(() => {
    localStorage.setItem('ams_employees', JSON.stringify(employees));
  }, [employees]);

  const handleSaveEmployee = (formData: any) => {
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.department || formData.department === 'All Departments') {
      alert("❌ REGISTRATION FAILED: Name, Email, and a valid Department are required.");
      return;
    }

    if (editingEmployee) {
      setEmployees((prev: any[]) => prev.map(emp => 
        emp.id === editingEmployee.id ? { ...emp, ...formData } : emp
      ));
      addLog('UPDATED', formData.name, `Profile modified: ${formData.department} / ${formData.role}`);
    } else {
      const newEmployee = {
        ...formData,
        id: Date.now(),
        assetsAssigned: 0,
        avatar: `https://ui-avatars.com/api/?name=${formData.name.replace(/\s/g, '+')}&background=0f172a&color=38bdf8`
      };
      setEmployees((prev: any[]) => [newEmployee, ...prev]);
      addLog('REGISTERED', formData.name, `New staff member onboarded to ${formData.department}`);
    }
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = (employee: any) => {
    if (window.confirm(`STRICT PROTOCOL: Permanently purge ${employee.name} from records?`)) {
      setEmployees((prev: any[]) => prev.filter(emp => emp.id !== employee.id));
      addLog('DELETED', employee.name, `Staff record purged from directory`);
    }
  };

  const departments = useMemo(() => {
    const depts = Array.from(new Set(employees.map((emp: any) => emp.department)));
    return ['All Departments', ...depts];
  }, [employees]);

  const filteredEmployees = employees.filter((emp: any) => {
    const matchesSearch = (emp.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (emp.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'All Departments' || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3 italic">
            <Users className="text-red-600" size={32} />
            Employees <span className="text-red-600">Registry</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
            AssetFlow // {employees.length} Active Records Indexed
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH DIRECTORY..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0f121d] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-[10px] font-black text-white placeholder:text-slate-700 uppercase tracking-widest focus:outline-none focus:border-red-600 w-64 transition-all shadow-2xl"
            />
          </div>

          <div className="relative">
            <select 
              value={deptFilter} 
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[#0f121d] border border-slate-800 rounded-2xl pl-4 pr-10 py-4 text-[10px] text-white appearance-none cursor-pointer hover:border-slate-600 transition-all uppercase font-black tracking-widest outline-none shadow-2xl"
            >
              {departments.map((dept: any) => <option key={dept} value={dept} className="bg-[#0f121d]">{dept}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <button 
            onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }} 
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-950/20 active:scale-95 transition-all italic"
          >
            <Plus size={18} strokeWidth={4} /> Onboard Staff
          </button>
        </div>
      </div>

      {/* EMPLOYEE GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredEmployees.map((employee: any) => (
          <div key={employee.id} className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-red-600/40 transition-all duration-500 shadow-2xl relative">
            <div className="p-8 flex items-start gap-8">
              {/* Avatar with Status Ring */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-3xl overflow-hidden border border-slate-800 group-hover:border-red-600/50 transition-all duration-500 shadow-2xl shadow-black/60 bg-slate-900">
                  <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#0f121d] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
              </div>

              <div className="flex-1 space-y-5">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic group-hover:text-red-500 transition-colors leading-none">{employee.name}</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-slate-500 font-black uppercase tracking-widest flex items-center gap-2 text-[10px]">
                      <Briefcase size={14} className="text-red-600" /> {employee.role}
                    </span>
                    <span className="text-slate-800 font-black text-xs">|</span>
                    <span className="text-slate-500 font-black uppercase tracking-widest flex items-center gap-2 text-[10px]">
                      <Building2 size={14} className="text-red-600" /> {employee.department}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                   <div className="bg-black/40 border border-slate-800/50 px-4 py-3 rounded-2xl flex items-center gap-4 group/box hover:border-red-600/30 transition-colors">
                      <Box size={18} className="text-red-600 group-hover/box:scale-110 transition-transform" />
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Assets Assigned</p>
                        <p className="text-xs font-black text-white uppercase tracking-tighter">{employee.assetsAssigned} Units</p>
                      </div>
                   </div>
                   <div className="bg-black/40 border border-slate-800/50 px-4 py-3 rounded-2xl flex items-center gap-4">
                      <Mail size={18} className="text-blue-500/80" />
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Communication</p>
                        <p className="text-[10px] font-bold text-slate-400 lowercase italic">{employee.email}</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Hover Actions Bar */}
            <div className="px-8 py-5 bg-black/40 border-t border-slate-800/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">Record Integrity Verified</p>
               <div className="flex gap-3">
                  <button onClick={() => { setEditingEmployee(employee); setIsModalOpen(true); }} className="p-3 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:text-white hover:border-slate-600 transition-all">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(employee)} className="p-3 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:text-red-500 hover:border-red-900/50 transition-all">
                    <Trash2 size={16} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* ZERO STATE */}
      {filteredEmployees.length === 0 && (
        <div className="py-32 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-[#0a0c14] shadow-2xl">
          <AlertTriangle className="mx-auto text-slate-800 mb-6" size={64} />
          <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-sm italic">No Records Found in Global Directory</p>
        </div>
      )}

      {isModalOpen && (
        <EmployeeModal 
          employee={editingEmployee} 
          onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }} 
          onSave={handleSaveEmployee} 
        />
      )}
    </div>
  );
};

export default Employees;
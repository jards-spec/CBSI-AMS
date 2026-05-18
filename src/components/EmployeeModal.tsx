import React, { useEffect, useState } from 'react';
import {
  X,
  Save,
  UserPlus,
  Shield,
  Mail,
  Building2,
  Briefcase,
  Hash,
} from 'lucide-react';

interface Props {
  employee?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const EmployeeModal: React.FC<Props> = ({ employee, onClose, onSave }) => {
  const isEditing = !!employee;

  const [formData, setFormData] = useState({
    name: '',
    employeeNumber: '',
    email: '',
    password: '',
    department: '',
    role: 'User',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        employeeNumber: employee.employeeNumber || '',
        email: employee.email || '',
        password: '',
        department: employee.department || '',
        role: employee.role || 'User',
      });
    } else {
      setFormData({
        name: '',
        employeeNumber: '',
        email: '',
        password: '',
        department: '',
        role: 'User',
      });
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      name: formData.name.trim(),
      employeeNumber: formData.employeeNumber.trim(),
      email: formData.email.trim(),
      department: formData.department,
      role: formData.role,
    };

    if (!isEditing || formData.password.trim()) {
      payload.password = formData.password;
    }

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-slate-800 bg-[#0f121d] shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800/50 bg-[#161b29]/30 p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-red-600/20 bg-red-600/10 p-3">
              <UserPlus className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">
                {isEditing ? 'Modify' : 'Initialize'} <span className="text-red-600">Employee</span>
              </h2>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                Directory Protocol // Identity & Access Provisioning
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-500 transition-all hover:text-white"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6 p-10">
          {/* FULL NAME */}
          <div className="space-y-2">
            <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Shield size={12} className="text-red-600" /> Full Identity
            </label>
            <input
              required
              className="w-full rounded-2xl border border-slate-800 bg-[#05070a] p-4 text-xs font-bold uppercase text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
              placeholder="E.G. CLINT PERLAS"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* EMPLOYEE NUMBER + EMAIL */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Hash size={12} className="text-red-600" /> Employee Number
              </label>
              <input
                required
                className="w-full rounded-2xl border border-slate-800 bg-[#05070a] p-4 text-xs font-black uppercase text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                placeholder="E.G. CB-10294"
                value={formData.employeeNumber}
                onChange={(e) =>
                  setFormData({ ...formData, employeeNumber: e.target.value.toUpperCase() })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Mail size={12} className="text-red-600" /> System Proxy (Email)
              </label>
              <input
                required
                type="email"
                className="w-full rounded-2xl border border-slate-800 bg-[#05070a] p-4 text-xs font-mono text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
                placeholder="USER@CENTRALBOOKS.COM"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Shield size={12} className="text-red-600" /> Password
            </label>
            <input
              required={!isEditing}
              type="password"
              className="w-full rounded-2xl border border-slate-800 bg-[#05070a] p-4 text-xs font-bold text-white outline-none transition-all placeholder:text-slate-800 focus:border-red-600"
              placeholder={isEditing ? 'Leave blank to keep current password' : 'Set initial account password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <p className="ml-1 text-[9px] font-bold text-slate-600">
              {isEditing
                ? 'Password is optional during edit. Leave blank if you do not want to change it.'
                : 'This password will be used together with the employee number for login.'}
            </p>
          </div>

          {/* DEPARTMENT + ROLE */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Building2 size={12} className="text-red-600" /> Sector
              </label>
              <div className="relative">
                <select
                  required
                  className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-800 bg-[#05070a] p-4 text-[10px] font-black uppercase text-white outline-none transition-all focus:border-red-600"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  <option value="">SELECT SECTOR</option>
                  <option value="Editorial Department">Editorial Department</option>
                  <option value="Creatives Department">Creatives Department</option>
                  <option value="Picturebooks Department">Picturebooks Department</option>
                  <option value="Yearbooks Department">Yearbooks Department</option>
                  <option value="Production Department">Production Department</option>
                  <option value="Accounting Department">Accounting Department</option>
                  <option value="MIS Department">MIS Department</option>
                  <option value="E-Commerce Department">E-Commerce Department</option>
                  <option value="Warehouse Department">Warehouse Department</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Admin">Admin</option>
                  <option value="Maintenance Department">Maintenance Department</option>
                  <option value="POD Department">POD Department</option>
                  <option value="Legal Materials">Legal Materials</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                  <Building2 size={14} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Briefcase size={12} className="text-red-600" /> Clearance
              </label>
              <div className="relative">
                <select
                  className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-800 bg-[#05070a] p-4 text-[10px] font-black uppercase text-white outline-none transition-all focus:border-red-600"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="User">User</option>
                  <option value="Superuser">Superuser</option>
                  <option value="Admin">Admin</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                  <Briefcase size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col gap-4 pt-8 md:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-800 bg-transparent px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:bg-slate-900 italic"
            >
              Abort
            </button>

            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-red-600 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-red-950/40 transition-all hover:bg-red-700 active:scale-95 italic"
            >
              <Save size={16} strokeWidth={3} />
              {isEditing ? 'Commit Profile' : 'Authorize Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;

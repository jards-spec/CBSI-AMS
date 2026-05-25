import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Mail,
  Box,
  Edit2,
  ChevronDown,
  Building2,
  Users,
  Briefcase,
  Crown,
  Star,
  User as UserIcon,
  LogOut,
  Lock,
  Archive,
  RotateCcw,
  Hash,
} from 'lucide-react';
import EmployeeModal from '../components/EmployeeModal';
import AdminPasswordConfirmModal from '../components/AdminPasswordConfirmModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useConfirm } from '../context/ConfirmContext';

type Scope = 'active' | 'archived' | 'all';

const Employees = () => {
  const confirmDialog = useConfirm();
  const { currentUser, logout, canCreate, canEdit, canDelete, canViewAll } = useAuth();
  const [scope, setScope] = useState<Scope>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [adminPasswordRequest, setAdminPasswordRequest] = useState<{
    title: string;
    message: string;
    confirmText: string;
    danger?: boolean;
    resolve: (password: string | null) => void;
  } | null>(null);

  const requestAdminPassword = (options: {
    title: string;
    message: string;
    confirmText: string;
    danger?: boolean;
  }) =>
    new Promise<string | null>((resolve) => {
      setAdminPasswordRequest({ ...options, resolve });
    });

  const closeAdminPasswordRequest = (password: string | null) => {
    adminPasswordRequest?.resolve(password);
    setAdminPasswordRequest(null);
  };

  const loadData = async (nextScope: Scope = scope) => {
    const [employeeRows, assetRows] = await Promise.all([
      api.employees.list(nextScope),
      api.assets.list('all'),
    ]);
    setEmployees(employeeRows);
    setAssets(assetRows);
  };

  useEffect(() => {
    loadData(scope).catch((error) => console.error('Failed to load employees:', error));
  }, [scope]);

  const departments = useMemo(() => {
    const unique = Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean)));
    return ['All Departments', ...unique];
  }, [employees]);

  const employeeRows = useMemo(() => {
    return employees.map((employee) => ({
      ...employee,
      assetsAssigned: assets.filter((asset) => asset.employeeId === employee.id).length,
      avatar:
        employee.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=0f172a&color=38bdf8`,
    }));
  }, [assets, employees]);

  const filteredEmployees = employeeRows.filter((employee) => {
    const matchesSearch =
      (employee.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.employeeNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'All Departments' || employee.department === deptFilter;
    const matchesPermission = canViewAll() || employee.id === currentUser?.id;

    return matchesSearch && matchesDept && matchesPermission;
  });

  const handleSaveEmployee = async (formData: any) => {
    try {
      const isEditingNow = Boolean(editingEmployee);
      const isPasswordChange =
        isEditingNow && Boolean(String(formData.password || '').trim());

      const ok = await confirmDialog({
        title: isEditingNow ? 'Confirm Employee Update' : 'Confirm Employee Creation',
        message: isEditingNow
          ? isPasswordChange
            ? `Save changes and update password for ${formData.name}?`
            : `Save profile changes for ${formData.name}?`
          : `Create employee record for ${formData.name}?`,
        confirmText: isEditingNow ? 'Save Changes' : 'Create Employee',
        cancelText: 'Cancel',
        danger: false,
      });

      if (!ok) return;

      const adminPassword = await requestAdminPassword({
        title: 'Admin Password Required',
        message: isEditingNow
          ? `Confirm your current admin password to update ${formData.name}.`
          : `Confirm your current admin password to create ${formData.name}.`,
        confirmText: isEditingNow ? 'Save Changes' : 'Create Employee',
      });
      if (!adminPassword) return;

      if (editingEmployee) {
        await api.employees.update(editingEmployee.id, { ...formData, adminPassword });
      } else {
        await api.employees.create({ ...formData, adminPassword });
      }

      await loadData();
      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (error: any) {
      window.alert(error.message);
    }
  };

  const handleArchive = async (employee: any) => {
    if (!canDelete()) {
      window.alert('You do not have permission to archive employees.');
      return;
    }

    if (employee.id === currentUser?.id) {
      window.alert('You cannot archive your own profile.');
      return;
    }

    const ok = await confirmDialog({
      title: 'Archive Employee',
      message: `Archive ${employee.name}?`,
      confirmText: 'Archive',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!ok) return;

    try {
      const adminPassword = await requestAdminPassword({
        title: 'Admin Password Required',
        message: `Confirm your current admin password to archive ${employee.name}.`,
        confirmText: 'Archive',
        danger: true,
      });
      if (!adminPassword) return;

      await api.employees.archive(employee.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
        adminPassword,
      });
      await loadData();
    } catch (error: any) {
      window.alert(error.message);
    }
  };

  const handleRestore = async (employee: any) => {
    if (!canDelete()) {
      window.alert('You do not have permission to restore employees.');
      return;
    }

    try {
      const adminPassword = await requestAdminPassword({
        title: 'Admin Password Required',
        message: `Confirm your current admin password to restore ${employee.name}.`,
        confirmText: 'Restore',
      });
      if (!adminPassword) return;

      await api.employees.restore(employee.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
        adminPassword,
      });
      await loadData();
    } catch (error: any) {
      window.alert(error.message);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Crown size={14} className="text-red-600" />;
      case 'Superuser':
        return <Star size={14} className="text-yellow-500" />;
      case 'User':
        return <UserIcon size={14} className="text-blue-500" />;
      default:
        return <UserIcon size={14} className="text-slate-500 dark:text-slate-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {

switch (role) {
      case 'Admin':
        return 'border-red-600/50 bg-red-600/10 text-red-500';
      case 'Superuser':
        return 'border-yellow-600/50 bg-yellow-600/10 text-yellow-500';
      case 'User':
        return 'border-blue-600/50 bg-blue-600/10 text-blue-500';
      default:
        return 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <img
              src={
                currentUser?.name
                  ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0f172a&color=38bdf8`
                  : ''
              }
              alt={currentUser?.name || 'User'}
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 italic dark:text-white">
                {currentUser?.name}
              </h3>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
              <span>{currentUser?.department}</span>
              {currentUser?.employeeNumber ? (
                <>
                  <span>â€¢</span>
                  <span>{currentUser.employeeNumber}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-red-600/50 hover:text-red-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-black uppercase tracking-tighter text-slate-900 italic dark:text-white">
            Employees <span className="text-red-600">Registry</span>
          </h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic dark:text-slate-500">
            AssetFlow // {canViewAll() ? employees.length : '1'} Active Records {canViewAll() ? 'Indexed' : 'Accessible'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            {(['active', 'archived', 'all'] as Scope[]).map((value) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                className={cn(
                  'rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all',
                  scope === value
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
                )}
              >
                {value}
              </button>
            ))}
          </div>

          {canViewAll() && (
            <>
              <div className="group relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-red-500 dark:text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="SEARCH NAME, EMAIL, OR EMPLOYEE NUMBER..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-600 shadow-lg dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:placeholder:text-slate-700 dark:shadow-2xl"
                />
              </div>

              <div className="relative">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-white py-4 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none transition-all hover:border-slate-300 shadow-lg dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:hover:border-slate-600 dark:shadow-2xl"
                >
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </>
          )}

          {canCreate() ? (
            <button
              onClick={() => {
                setEditingEmployee(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-2xl bg-red-600 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-950/20 transition-all active:scale-95 hover:bg-red-700 italic"
            >
              <Plus size={18} strokeWidth={4} /> Onboard Staff
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 italic dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              <Lock size={14} /> Read-Only Access
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
              <th className="px-6 py-5">Employee</th>
              <th className="px-6 py-5">Employee Number</th>
              <th className="px-6 py-5">Department / Role</th>
              <th className="px-6 py-5">Email</th>
              <th className="px-6 py-5">Assets</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
            {filteredEmployees.map((employee) => {
              const isCurrentUser = employee.id === currentUser?.id;
              const canEditThis = canEdit(employee.id);
              const canArchiveThis = canDelete();
              const isArchived = Number(employee.isArchived || 0) === 1;

              return (
                <tr
                  key={employee.id}
                  className={cn(
                    'transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20',
                    isArchived && 'opacity-70',
                  )}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                        <img
                          src={employee.avatar}
                          alt={employee.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {employee.name}
                          </p>

                          {isCurrentUser ? (
                            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-red-500">
                              You
                            </span>
                          ) : null}

                          {isArchived ? (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-500">
                              Archived
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                      <Hash size={14} className="text-red-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                        {employee.employeeNumber || 'UNASSIGNED'}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                        <Building2 size={14} className="text-red-600" />
                        {employee.department || 'Unassigned'}
                      </div>

                      <div
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${getRoleBadgeColor(
                          employee.role || 'User',
                        )}`}
                      >
                        {getRoleIcon(employee.role || 'User')}
                        <span className="text-[8px] font-black uppercase tracking-wider">
                          {employee.role || 'User'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      <Mail size={14} className="text-blue-500/80" />
                      <span className="italic">{employee.email}</span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                      <Box size={14} className="text-red-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                        {employee.assetsAssigned} Units
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {!isArchived && canEditThis ? (
                        <button
                          onClick={() => {
                            setEditingEmployee(employee);
                            setIsModalOpen(true);
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition-all hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-white"
                        >
                          <Edit2 size={16} />
                        </button>
                      ) : null}

                      {!isArchived && canArchiveThis ? (
                        <button
                          onClick={() => handleArchive(employee)}
                          className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-600 transition-all hover:bg-red-600 hover:text-white dark:border-red-900/50 dark:bg-slate-900 dark:text-red-500 dark:hover:border-red-600/50 dark:hover:bg-red-600"
                        >
                          <Archive size={16} />
                        </button>
                      ) : null}

                      {isArchived && canArchiveThis ? (
                        <button
                          onClick={() => handleRestore(employee)}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-500"
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-20 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic dark:text-slate-600"
                >
                  {canViewAll() ? 'No Records Found in Global Directory' : 'Access Restricted To Your Profile Only'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEmployee(null);
          }}
          onSave={handleSaveEmployee}
        />
      ) : null}
    </div>
  );
};

export default Employees;





import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  LayoutGrid,
  List,
  Key,
  Copy,
  Archive,
  RotateCcw,
  Users,
  X,
  Calendar,
  BadgeCheck,
  BadgeX,
} from 'lucide-react';
import { cn } from '../lib/utils';
import LicenseModal from '../components/LicenseModal';
import TransactionModal from '../components/TransactionModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

type Scope = 'active' | 'archived' | 'all';

type Assignee = {
  id: string;
  licenseId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  quantity: number;
  assignedAt: string;
  assignedById: string;
  assignedByName: string;
  status: 'ACTIVE' | 'REMOVED';
  returnedAt: string | null;
  returnedById: string | null;
  returnedByName: string | null;
  notes: string;
};

const SoftwareLicenses = () => {
  
  const confirmDialog = useConfirm();
const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [scope, setScope] = useState<Scope>('active');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [pendingLicense, setPendingLicense] = useState<any>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [transactionMode, setTransactionMode] = useState<'checkout' | 'checkin' | null>(null);
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Assignees state
  const [showAssigneesModal, setShowAssigneesModal] = useState(false);
  const [viewingLicense, setViewingLicense] = useState<any>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesScope, setAssigneesScope] = useState<'active' | 'removed' | 'all'>('active');

  const refresh = async (nextScope: Scope = scope) => {
    try {
      const [licenseRows, employeeRows] = await Promise.all([
        api.licenses.list(nextScope),
        api.employees.list('active'),
      ]);
      setLicenses(Array.isArray(licenseRows) ? licenseRows : []);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
    } catch (error) {
      console.error('Failed to load licenses:', error);
    }
  };

  useEffect(() => {
    refresh(scope);
  }, [scope]);

  const filteredLicenses = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return licenses.filter((license) =>
      [license.name, license.manufacturer, license.licensedEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [licenses, searchQuery]);

  const canRevealSecurityKey = useMemo(() => {
    const role = String(currentUser?.role || '').trim().toLowerCase();
    return ['admin', 'superuser', 'super admin'].includes(role);
  }, [currentUser?.role]);

  const loadAssignees = async (licenseId: string, status: 'active' | 'removed' | 'all' = 'active') => {
    setAssigneesLoading(true);
    try {
      const rows = await api.licenses.assignees(licenseId, status);
      setAssignees(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load assignees:', error);
      setAssignees([]);
    } finally {
      setAssigneesLoading(false);
    }
  };

  const handleViewAssignees = async (license: any) => {
    setViewingLicense(license);
    setAssigneesScope('active');
    await loadAssignees(license.id, 'active');
    setShowAssigneesModal(true);
  };

  const handleAssigneesScopeChange = async (newScope: 'active' | 'removed' | 'all') => {
    setAssigneesScope(newScope);
    if (viewingLicense) {
      await loadAssignees(viewingLicense.id, newScope);
    }
  };

  const handleKeyClick = (license: any) => {
    
  const confirmDialog = useConfirm();
const isVisible = !!showKeys[license.id];

    if (isVisible) {
      setShowKeys((current) => ({ ...current, [license.id]: false }));
      return;
    }

    if (!canRevealSecurityKey) {
      alert('Only Admin/Superuser can reveal security keys.');
      return;
    }

    setPendingLicense(license);
    setConfirmPassword('');
    setConfirmError('');
    setShowKeyPrompt(true);
  };

  const handleConfirmReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLicense) return;

    setConfirmLoading(true);
    setConfirmError('');

    try {
      const response = await api.licenses.revealKey(pendingLicense.id, confirmPassword);
      setRevealedKeys((prev) => ({ ...prev, [pendingLicense.id]: response.key }));
      setShowKeys((prev) => ({ ...prev, [pendingLicense.id]: true }));
      setShowKeyPrompt(false);
      setPendingLicense(null);
      setConfirmPassword('');
    } catch (error: any) {
      setConfirmError(error.message || 'Password verification failed.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      if (editingLicense) {
        await api.licenses.update(editingLicense.id, formData);
      } else {
        await api.licenses.create(formData);
      }
      await refresh();
      setEditingLicense(null);
      setIsModalOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleClone = async (license: any) => {
    try {
      await api.licenses.create({
        ...license,
        name: `${license.name} (COPY)`,
      });
      await refresh();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleArchive = async (license: any) => {
    const ok = await confirmDialog({
  title: 'Archive License',
  message: `Archive ${license.name}?`,
  confirmText: 'Archive',
  cancelText: 'Cancel',
  danger: true,
});
if (!ok) return;
    try {
      await api.licenses.archive(license.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await refresh();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRestore = async (license: any) => {
    try {
      await api.licenses.restore(license.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await refresh();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleTransactionSubmit = async (payload: any) => {
    if (!transactionMode) return;
    setTransactionLoading(true);
    try {
      if (transactionMode === 'checkout') {
        await api.transactions.checkout(payload);
      } else {
        await api.transactions.checkin(payload);
      }
      await refresh();
      setSelectedLicense(null);
      setTransactionMode(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setTransactionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    
  const confirmDialog = useConfirm();
if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Software Licenses
          </h1>
          <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
            Managing software entitlements and seat utilization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            {(['active', 'archived', 'all'] as Scope[]).map((value) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                className={cn(
                  'rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all',
                  scope === value
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-lg p-2 transition-all',
                viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-slate-600 dark:text-slate-500',
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-lg p-2 transition-all',
                viewMode === 'table' ? 'bg-red-600 text-white' : 'text-slate-600 dark:text-slate-500',
              )}
            >
              <List size={16} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search licenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={() => {
              setEditingLicense(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all active:scale-95 hover:bg-red-700"
          >
            <Plus size={16} strokeWidth={3} /> Add Entitlement
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredLicenses.map((license) => {
            const usedSeats = Number(license.total || 0) - Number(license.avail || 0);
            const remainingPercent =
              Number(license.total || 0) > 0 ? (Number(license.avail || 0) / Number(license.total || 0)) * 100 : 0;
            const isLow = remainingPercent < 20;
            const canCheckin = Number(license.avail || 0) < Number(license.total || 0);
            const isArchived = Number(license.isArchived || 0) === 1;

            return (
              <div
                key={license.id}
                className={cn(
                  'rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl',
                  isArchived && 'opacity-70',
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <button
                      onClick={() => handleViewAssignees(license)}
                      className="text-left hover:text-red-600 transition-colors"
                    >
                      <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white hover:text-red-600">
                        {license.name}
                      </h3>
                    </button>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500">
                      {license.manufacturer || 'Unknown Manufacturer'}
                    </p>
                  </div>
                  {isArchived ? (
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-amber-500">
                      Archived
                    </span>
                  ) : null}
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <code className="rounded bg-slate-100 px-2 py-1 text-[10px] font-mono text-slate-600 dark:bg-black/20 dark:text-slate-400">
                    {showKeys[license.id] ? (revealedKeys[license.id] || 'â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢') : 'â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢'}
                  </code>
                  <button
                    onClick={() => handleKeyClick(license)}
                    className="text-slate-500 transition-all hover:text-cyan-500"
                  >
                    <Key size={12} />
                  </button>
                </div>

                <div className="mb-4 space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-500">Total</span>
                    <span className="font-bold text-slate-900 dark:text-white">{license.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-500">Used</span>
                    <span className="font-bold text-slate-900 dark:text-white">{usedSeats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-500">Available</span>
                    <span className="font-bold text-slate-900 dark:text-white">{license.avail}</span>
                  </div>
                </div>

                <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className={cn('h-full transition-all duration-700', isLow ? 'bg-orange-500' : 'bg-emerald-500')}
                    style={{ width: `${remainingPercent}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isArchived ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedLicense(license);
                          setTransactionMode('checkout');
                        }}
                        disabled={Number(license.avail || 0) <= 0}
                        className="rounded bg-[#d63384] px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter text-white transition-all disabled:opacity-30 hover:bg-[#b52a6f]"
                      >
                        Checkout
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLicense(license);
                          setTransactionMode('checkin');
                        }}
                        disabled={!canCheckin}
                        className="rounded bg-emerald-600 px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter text-white transition-all disabled:opacity-30 hover:bg-emerald-700"
                      >
                        Checkin
                      </button>
                      <button
                        onClick={() => handleViewAssignees(license)}
                        className="rounded bg-cyan-500/10 p-2 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                        title="View Assignees"
                      >
                        <Users size={12} />
                      </button>
                      <button
                        onClick={() => handleClone(license)}
                        className="rounded bg-cyan-500/10 p-2 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingLicense(license);
                          setIsModalOpen(true);
                        }}
                        className="rounded bg-orange-500/10 p-2 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleArchive(license)}
                        className="rounded bg-red-500/10 p-2 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <Archive size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestore(license)}
                      className="rounded bg-emerald-500/10 p-2 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Manufacturer</th>
                <th className="px-5 py-4">Security Key</th>
                <th className="px-5 py-4 text-center">Min. Qty</th>
                <th className="px-5 py-4 text-center">Total</th>
                <th className="px-5 py-4 text-center">Used</th>
                <th className="px-5 py-4">% Remaining</th>
                <th className="px-5 py-4">Transactions</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
              {filteredLicenses.map((license) => {
                const usedSeats = Number(license.total || 0) - Number(license.avail || 0);
                const remainingPercent =
                  Number(license.total || 0) > 0 ? (Number(license.avail || 0) / Number(license.total || 0)) * 100 : 0;
                const isLow = remainingPercent < 20;
                const canCheckin = Number(license.avail || 0) < Number(license.total || 0);
                const isArchived = Number(license.isArchived || 0) === 1;

                return (
                  <tr
                    key={license.id}
                    className={cn(
                      'text-[11px] transition-colors hover:bg-slate-50 dark:hover:bg-white/2',
                      isArchived && 'opacity-70',
                    )}
                  >
                    <td className="px-5 py-5 font-bold uppercase tracking-tighter text-cyan-700 italic dark:text-cyan-400">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewAssignees(license)}
                          className="hover:text-red-600 hover:underline transition-all text-left"
                        >
                          {license.name}
                        </button>
                        {isArchived ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-500">
                            Archived
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-500">
                      {license.manufacturer}
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono tracking-tight text-slate-600 dark:bg-black/20 dark:text-slate-400">
                          {showKeys[license.id] ? (revealedKeys[license.id] || 'â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢') : 'â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢'}
                        </code>
                        <button
                          onClick={() => handleKeyClick(license)}
                          className="text-slate-500 transition-all hover:text-cyan-500"
                        >
                          <Key size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-center font-bold text-slate-500 dark:text-slate-600">
                      {license.minQty || 2}
                    </td>
                    <td className="px-5 py-5 text-center font-bold text-slate-700 dark:text-slate-400">
                      {license.total}
                    </td>
                    <td className="px-5 py-5 text-center font-black text-slate-900 dark:text-white">
                      {usedSeats}
                    </td>
                    <td className="min-w-30 px-5 py-5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className={cn('h-full transition-all duration-700', isLow ? 'bg-orange-500' : 'bg-emerald-500')}
                          style={{ width: `${remainingPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      {!isArchived ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedLicense(license);
                              setTransactionMode('checkout');
                            }}
                            disabled={Number(license.avail || 0) <= 0}
                            className="rounded bg-[#d63384] px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter text-white transition-all disabled:opacity-30 hover:bg-[#b52a6f]"
                          >
                            Checkout
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLicense(license);
                              setTransactionMode('checkin');
                            }}
                            disabled={!canCheckin}
                            className="rounded bg-emerald-600 px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter text-white transition-all disabled:opacity-30 hover:bg-emerald-700"
                          >
                            Checkin
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {!isArchived ? (
                          <>
                            <button
                              onClick={() => handleViewAssignees(license)}
                              className="rounded bg-cyan-500/10 p-1.5 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                              title="View Assignees"
                            >
                              <Users size={12} strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleClone(license)}
                              className="rounded bg-cyan-500/10 p-1.5 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                            >
                              <Copy size={12} strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingLicense(license);
                                setIsModalOpen(true);
                              }}
                              className="rounded bg-orange-500/10 p-1.5 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                            >
                              <Edit2 size={12} strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleArchive(license)}
                              className="rounded bg-red-500/10 p-1.5 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                            >
                              <Archive size={12} strokeWidth={3} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(license)}
                            className="rounded bg-emerald-500/10 p-1.5 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                          >
                            <RotateCcw size={12} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredLicenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600"
                  >
                    No licenses found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <LicenseModal
          license={editingLicense}
          onClose={() => {
            setEditingLicense(null);
            setIsModalOpen(false);
          }}
          onSave={handleSave}
        />
      ) : null}

      <TransactionModal
        isOpen={!!transactionMode && !!selectedLicense}
        mode={transactionMode || 'checkout'}
        resourceType="license"
        item={selectedLicense}
        employees={employees}
        loading={transactionLoading}
        onClose={() => {
          if (transactionLoading) return;
          setSelectedLicense(null);
          setTransactionMode(null);
        }}
        onSubmit={handleTransactionSubmit}
      />

      {showKeyPrompt && pendingLicense ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f121d] p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Confirm Password</h3>
            <p className="mt-2 text-[11px] text-slate-400">
              Enter your current password to reveal the security key for {pendingLicense.name}.
            </p>

            <form onSubmit={handleConfirmReveal} className="mt-4 space-y-3">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#05070a] px-3 py-2 text-xs text-white outline-none focus:border-red-600"
                placeholder="Current password"
                required
              />

              {confirmError ? <p className="text-[11px] text-red-400">{confirmError}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmLoading) return;
                    setShowKeyPrompt(false);
                    setPendingLicense(null);
                    setConfirmPassword('');
                    setConfirmError('');
                  }}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmLoading}
                  className="rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
                >
                  {confirmLoading ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Assignees Modal */}
      {showAssigneesModal && viewingLicense ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0f121d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-6">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-white">
                  {viewingLicense.name}
                </h2>
                <p className="text-[11px] text-slate-400">License Assignments</p>
              </div>
              <button
                onClick={() => setShowAssigneesModal(false)}
                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex rounded-xl border border-slate-800 bg-[#05070a] p-1">
                  {(['active', 'removed', 'all'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleAssigneesScopeChange(status)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all',
                        assigneesScope === status
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-400 hover:text-white',
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500">
                  {assignees.length} assignment{assignees.length !== 1 ? 's' : ''} found
                </div>
              </div>

              {assigneesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
                </div>
              ) : assignees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users size={48} className="mb-4 text-slate-600" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    No assignments found
                  </p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {assigneesScope === 'active'
                      ? 'No active assignments for this license'
                      : assigneesScope === 'removed'
                      ? 'No removed assignments for this license'
                      : 'No assignments exist for this license'}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#05070a] text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Employee #</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3">Assigned</th>
                        <th className="px-4 py-3">Assigned By</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Returned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {assignees.map((assignee) => (
                        <tr key={assignee.id} className="text-[11px] hover:bg-[#05070a]">
                          <td className="px-4 py-4 font-bold text-white">
                            {assignee.employeeName || 'Unknown'}
                          </td>
                          <td className="px-4 py-4 font-mono text-[10px] text-slate-400">
                            {assignee.employeeNumber || 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-slate-400">
                            {assignee.department || 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-cyan-400">
                            {assignee.quantity}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar size={10} />
                              <span className="font-mono text-[10px]">{formatDate(assignee.assignedAt)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-400">
                            {assignee.assignedByName || 'System'}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {assignee.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500">
                                <BadgeCheck size={8} /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-red-500">
                                <BadgeX size={8} /> Removed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {assignee.returnedAt ? (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar size={10} />
                                <span className="font-mono text-[10px]">{formatDate(assignee.returnedAt)}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600">â€”</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-800 p-4">
              <button
                onClick={() => setShowAssigneesModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SoftwareLicenses;


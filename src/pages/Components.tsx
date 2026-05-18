import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Copy,
  Package,
  X,
  CheckCircle2,
  Monitor,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import TransactionModal from '../components/TransactionModal';
import { useConfirm } from '../context/ConfirmContext';

type Scope = 'active' | 'archived' | 'all';

const defaultForm = {
  name: '',
  category: 'MEMORY (RAM)',
  model: '',
  location: '',
  total: '',
  minQty: '',
};

const Components = () => {
  
  const confirmDialog = useConfirm();
const { currentUser } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<Scope>('active');

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'checkin' | 'checkout' | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState(defaultForm);

  const refresh = async (nextScope: Scope = scope) => {
    setLoading(true);
    try {
      const [componentRows, assetRows] = await Promise.all([
        api.components.list(nextScope),
        api.assets.list('active'),
      ]);

      setItems(Array.isArray(componentRows) ? componentRows : []);
      setAssets(Array.isArray(assetRows) ? assetRows : []);
    } catch (err) {
      console.error('Failed to load components:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(scope);
  }, [scope]);

  const loadAssignmentsForItem = async (itemId: string | number) => {
    try {
      const rows = await api.components.assignments(itemId, 'active');
      setActiveAssignments(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load component assignments:', error);
      setActiveAssignments([]);
    }
  };

  const openCreate = () => {
    
  const confirmDialog = useConfirm();
setEditingItem(null);
    setIsCustomCategory(false);
    setFormData(defaultForm);
    setIsRegisterOpen(true);
  };

  const openEdit = (item: any) => {
    
  const confirmDialog = useConfirm();
setEditingItem(item);
    setIsCustomCategory(
      ![
        'MEMORY (RAM)',
        'STORAGE (SSD/HDD)',
        'GPU',
        'CPU',
        'POWER',
        'COOLING',
        'NETWORKING',
      ].includes(item.category),
    );

    setFormData({
      name: item.name || '',
      category: item.category || 'MEMORY (RAM)',
      model: item.model || '',
      location: item.location || '',
      total: String(item.total ?? ''),
      minQty: String(item.minQty ?? ''),
    });

    setIsRegisterOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      category: formData.category,
      model: formData.model,
      location: formData.location,
      total: Number(formData.total || 0),
      minQty: Number(formData.minQty || 0),
      unitCost: editingItem?.unitCost ?? 0,
      status: editingItem?.status ?? 'AVAILABLE',
      remaining: editingItem?.remaining ?? Number(formData.total || 0),
      assignedTo: editingItem?.assignedTo ?? null,
      checkoutDate: editingItem?.checkoutDate ?? null,
      expectedCheckinDate: editingItem?.expectedCheckinDate ?? null,
      notes: editingItem?.notes ?? null,
    };

    try {
      if (editingItem) {
        await api.components.update(editingItem.id, payload);
      } else {
        await api.components.create(payload);
      }

      setIsRegisterOpen(false);
      setEditingItem(null);
      setIsCustomCategory(false);
      setFormData(defaultForm);
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleClone = async (item: any) => {
    try {
      await api.components.create({
        name: `${item.name} (COPY)`,
        category: item.category,
        model: item.model,
        location: item.location,
        total: Number(item.total || 0),
        minQty: Number(item.minQty || 0),
        unitCost: Number(item.unitCost || 0),
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleArchive = async (item: any) => {
    const ok = await confirmDialog({
  title: 'Archive Component',
  message: `Archive ${item.name}?`,
  confirmText: 'Archive',
  cancelText: 'Cancel',
  danger: true,
});
if (!ok) return;
    try {
      await api.components.archive(item.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleRestore = async (item: any) => {
    try {
      await api.components.restore(item.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const openTransaction = async (item: any, mode: 'checkout' | 'checkin') => {
    setSelectedItem(item);
    setModalMode(mode);

    if (mode === 'checkin' || mode === 'checkout') {
      await loadAssignmentsForItem(item.id);
    }
  };

  const handleTransactionSubmit = async (payload: any) => {
    if (!modalMode || !selectedItem) return;

    try {
      if (modalMode === 'checkout') {
        await api.transactions.checkout({
          ...payload,
          assignedById: currentUser?.id,
          assignedByName: currentUser?.name,
        });
      } else {
        await api.transactions.checkin({
          ...payload,
          assignedById: currentUser?.id,
          assignedByName: currentUser?.name,
        });
      }

      setModalMode(null);
      setSelectedItem(null);
      setActiveAssignments([]);
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const getStatusStyle = (status: string) => {
    
  const confirmDialog = useConfirm();
switch (status?.toUpperCase()) {
      case 'AVAILABLE':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'DEPLOYED':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      [item.name, item.model, item.category, item.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [items, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
          Syncing Component Registry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Components
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-600 italic dark:text-slate-500">
            Management Console // {items.length} Units Indexed
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Filter components..."
              className="w-64 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all hover:bg-red-700"
          >
            <Plus size={16} strokeWidth={3} /> Register Component
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
              <th className="px-6 py-5">Component Details</th>
              <th className="px-6 py-5">Category / Model</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Stock</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
            {filteredItems.map((item) => {
              const isArchived = Number(item.isArchived || 0) === 1;

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'group text-[11px] transition-colors hover:bg-slate-50 dark:hover:bg-white/1',
                    isArchived && 'opacity-70',
                  )}
                >
                  <td className="px-6 py-5">
                    <div className="font-bold uppercase italic tracking-tighter text-slate-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
                      {item.name}
                    </div>
                    <div className="mt-1 text-[9px] uppercase text-slate-500 dark:text-slate-600">
                      {item.location || 'â€”'}
                    </div>
                  </td>

                  <td className="px-6 py-5 font-bold uppercase tracking-tighter text-slate-700 dark:text-slate-400">
                    <div>{item.category}</div>
                    <div className="mt-1 text-[9px] italic text-slate-500 dark:text-slate-600">
                      {item.model || 'â€”'}
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-block rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-widest',
                          getStatusStyle(item.status),
                        )}
                      >
                        {item.status || 'AVAILABLE'}
                      </span>
                      {isArchived ? (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-amber-500">
                          Archived
                        </span>
                      ) : null}
                    </div>
                    {item.assignedTo ? (
                      <div className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">
                        {item.assignedTo}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.remaining ?? item.total}
                      <span className="font-normal text-slate-500 dark:text-slate-600"> / {item.total}</span>
                    </div>
                    <div className="mt-0.5 text-[9px] uppercase text-slate-500 dark:text-slate-600">
                      Min: {item.minQty ?? 0}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!isArchived ? (
                        <button
                          onClick={() =>
                            openTransaction(item, item.status === 'DEPLOYED' ? 'checkin' : 'checkout')
                          }
                          className="rounded bg-[#d63384] px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter text-white shadow-lg shadow-pink-900/10 transition-all hover:bg-[#b52a6f]"
                        >
                          {item.status === 'DEPLOYED' ? 'Remove' : 'Install'}
                        </button>
                      ) : null}

                      <div className="flex items-center gap-1.5">
                        {!isArchived ? (
                          <>
                            <button
                              onClick={() => handleClone(item)}
                              className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                            >
                              <Copy size={12} strokeWidth={3} />
                            </button>

                            <button
                              onClick={() => openEdit(item)}
                              className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-2 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                            >
                              <Edit2 size={12} />
                            </button>

                            <button
                              onClick={() => handleArchive(item)}
                              className="rounded-lg border border-red-600/20 bg-red-600/10 p-2 text-red-600 transition-all hover:bg-red-600 hover:text-white"
                            >
                              <Archive size={12} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(item)}
                            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600"
                >
                  No components found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isRegisterOpen ? (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f121d]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 p-6 dark:border-slate-800 dark:bg-[#161b29]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-600/10 p-2">
                  <Package className="text-red-600" size={18} />
                </div>
                <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                  {editingItem ? 'Edit Component' : 'Register Component'}
                </h3>
              </div>

              <button
                onClick={() => {
                  setIsRegisterOpen(false);
                  setEditingItem(null);
                  setFormData(defaultForm);
                }}
                className="text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                  Component Name
                </label>
                <input
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold uppercase text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-red-600 dark:border-slate-800 dark:bg-[#161b29] dark:text-white dark:placeholder:text-slate-700"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 16GB RAM MODULE"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      setFormData({ ...formData, category: isCustomCategory ? 'MEMORY (RAM)' : '' });
                    }}
                    className="text-[8px] font-bold uppercase text-red-500 hover:text-red-400"
                  >
                    {isCustomCategory ? 'Select Existing' : '+ Custom'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    required
                    className="w-full rounded-xl border border-red-300 bg-slate-50 p-3 text-xs font-bold uppercase text-slate-900 outline-none focus:border-red-600 dark:border-red-900/50 dark:bg-[#161b29] dark:text-white"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                    placeholder="TYPE CATEGORY NAME..."
                    autoFocus
                  />
                ) : (
                  <select
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold uppercase text-slate-900 outline-none focus:border-red-600 dark:border-slate-800 dark:bg-[#161b29] dark:text-white"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option>MEMORY (RAM)</option>
                    <option>STORAGE (SSD/HDD)</option>
                    <option>GPU</option>
                    <option>CPU</option>
                    <option>POWER</option>
                    <option>COOLING</option>
                    <option>NETWORKING</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Model No.
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-red-600 dark:border-slate-800 dark:bg-[#161b29] dark:text-white"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. DDR4-3200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Location
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-red-600 dark:border-slate-800 dark:bg-[#161b29] dark:text-white"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. MIS Storage Room"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Total Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-red-600 dark:border-slate-800 dark:bg-[#161b29] dark:text-white"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Min Qty Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-red-600 dark:border-slate-800 dark:bg-[#161b29] dark:text-white"
                    value={formData.minQty}
                    onChange={(e) => setFormData({ ...formData, minQty: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterOpen(false);
                    setEditingItem(null);
                    setFormData(defaultForm);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-[10px] font-black uppercase text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-500 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-600 py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700"
                >
                  {editingItem ? 'Update' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <TransactionModal
        isOpen={!!modalMode && !!selectedItem}
        mode={modalMode || 'checkout'}
        resourceType="component"
        item={selectedItem}
        assets={assets}
        activeAssignments={activeAssignments}
        loading={loading}
        onClose={() => {
          setModalMode(null);
          setSelectedItem(null);
          setActiveAssignments([]);
        }}
        onSubmit={handleTransactionSubmit}
      />

      {modalMode === 'checkin' && selectedItem && activeAssignments.length === 0 ? (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#0f121d]">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              No Active Assignment
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-500">
              This component is marked deployed, but no active asset assignment was found.
            </p>
            <div className="mt-8">
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedItem(null);
                  setActiveAssignments([]);
                }}
                className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
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

export default Components;



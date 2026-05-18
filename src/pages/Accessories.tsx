import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Copy, Archive, RotateCcw } from 'lucide-react';
import AccessoryModal from '../components/AccessoryModal';
import TransactionModal from '../components/TransactionModal';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

type Scope = 'active' | 'archived' | 'all';

const Accessories = () => {
  
  const confirmDialog = useConfirm();
const { currentUser } = useAuth();

  const [scope, setScope] = useState<Scope>('active');
  const [items, setItems] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [transactionMode, setTransactionMode] = useState<'checkout' | 'checkin' | null>(null);
  const [transactionLoading, setTransactionLoading] = useState(false);

  const refresh = async (nextScope: Scope = scope) => {
    setLoading(true);
    try {
      const [accessoryRows, assetRows] = await Promise.all([
        api.accessories.list(nextScope),
        api.assets.list('active'),
      ]);

      setItems(Array.isArray(accessoryRows) ? accessoryRows : []);
      setAssets(Array.isArray(assetRows) ? assetRows : []);
    } catch (error) {
      console.error('Failed to load accessories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(scope);
  }, [scope]);

  const loadAssignmentsForItem = async (itemId: string | number) => {
    try {
      const rows = await api.accessories.assignments(itemId, 'active');
      setActiveAssignments(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load accessory assignments:', error);
      setActiveAssignments([]);
    }
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      [item.name, item.modelNo, item.category, item.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [items, searchQuery]);

  const handleSave = async (formData: any) => {
    try {
      if (editingItem) {
        await api.accessories.update(editingItem.id, formData);
      } else {
        await api.accessories.create(formData);
      }

      await refresh();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleClone = async (item: any) => {
    try {
      await api.accessories.create({
        ...item,
        name: `${item.name} (COPY)`,
        checkedOut: 0,
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleArchive = async (item: any) => {
const ok = await confirmDialog({
  title: 'Archive Accessory',
  message: `Archive ${item.name}?`,
  confirmText: 'Archive',
  cancelText: 'Cancel',
  danger: true,
});
if (!ok) return;
    try {
      await api.accessories.archive(item.id, {
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
      await api.accessories.restore(item.id, {
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
    setTransactionMode(mode);
    await loadAssignmentsForItem(item.id);
  };

  const handleTransactionSubmit = async (payload: any) => {
    if (!transactionMode || !selectedItem) return;

    setTransactionLoading(true);
    try {
      if (transactionMode === 'checkout') {
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

      await refresh();
      setSelectedItem(null);
      setTransactionMode(null);
      setActiveAssignments([]);
    } catch (error: any) {
      console.warn(error.message);
    } finally {
      setTransactionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Accessories</h1>
          <p className="text-xs italic text-slate-600 dark:text-slate-500">
            Managing hardware peripherals and desk equipment.
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
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"
              size={14}
            />
            <input
              type="text"
              placeholder="Search accessories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:border-slate-800 dark:bg-[#0f121d] dark:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/20 transition-all active:scale-95 hover:bg-red-700"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800/60 dark:bg-[#0f121d] dark:shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#161b22]">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Category</th>
                <th className="px-4 py-4">Model No.</th>
                <th className="px-4 py-4">Location</th>
                <th className="px-4 py-4 text-center">Min. Qty</th>
                <th className="px-4 py-4 text-center">Total</th>
                <th className="px-4 py-4 text-center">Checked Out</th>
                <th className="px-4 py-4">% Remaining</th>
                <th className="px-4 py-4">Transactions</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
              {filteredItems.map((item) => {
                const available = Number(item.total || 0) - Number(item.checkedOut || 0);
                const pct =
                  Number(item.total || 0) > 0 ? (available / Number(item.total || 0)) * 100 : 0;
                const isArchived = Number(item.isArchived || 0) === 1;

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'text-[11px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/20',
                      isArchived && 'opacity-70',
                    )}
                  >
                    <td className="px-4 py-4 font-bold text-cyan-700 dark:text-cyan-400">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {isArchived ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-500">
                            Archived
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-500">
                      {item.category}
                    </td>

                    <td className="px-4 py-4 font-medium text-cyan-700 dark:text-cyan-600">
                      {item.modelNo}
                    </td>

                    <td className="px-4 py-4 text-cyan-700/80 dark:text-cyan-600/80">
                      {item.location}
                    </td>

                    <td className="px-4 py-4 text-center text-slate-500 dark:text-slate-600">
                      {item.minQty}
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-slate-900 dark:text-white">
                      {item.total}
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-slate-900 dark:text-white">
                      {item.checkedOut}
                    </td>

                    <td className="min-w-30 px-4 py-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className={cn(
                            'h-full transition-all duration-700',
                            pct < 20 ? 'bg-orange-500' : 'bg-emerald-500',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {!isArchived ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openTransaction(item, 'checkout')}
                            disabled={available <= 0}
                            className="rounded bg-[#d63384] px-3 py-1.5 text-[9px] font-black uppercase text-white transition-all disabled:opacity-30 hover:bg-[#b52a6f]"
                          >
                            Attach
                          </button>

                          <button
                            onClick={() => openTransaction(item, 'checkin')}
                            disabled={Number(item.checkedOut || 0) <= 0}
                            className="rounded bg-emerald-600 px-3 py-1.5 text-[9px] font-black uppercase text-white transition-all disabled:opacity-30 hover:bg-emerald-700"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                          Archived
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {!isArchived ? (
                          <>
                            <button
                              onClick={() => handleClone(item)}
                              className="rounded bg-cyan-500/10 p-1.5 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                            >
                              <Copy size={12} />
                            </button>

                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setIsModalOpen(true);
                              }}
                              className="rounded bg-orange-500/10 p-1.5 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                            >
                              <Edit2 size={12} />
                            </button>

                            <button
                              onClick={() => handleArchive(item)}
                              className="rounded bg-red-500/10 p-1.5 text-red-600 transition-all hover:bg-red-600 hover:text-white"
                            >
                              <Archive size={12} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(item)}
                            className="rounded bg-emerald-500/10 p-1.5 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600"
                  >
                    No accessories found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <AccessoryModal
          item={editingItem}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
        />
      ) : null}

      <TransactionModal
        isOpen={!!transactionMode && !!selectedItem}
        mode={transactionMode || 'checkout'}
        resourceType="accessory"
        item={selectedItem}
        assets={assets}
        activeAssignments={activeAssignments}
        loading={transactionLoading}
        onClose={() => {
          if (transactionLoading) return;
          setSelectedItem(null);
          setTransactionMode(null);
          setActiveAssignments([]);
        }}
        onSubmit={handleTransactionSubmit}
      />
    </div>
  );
};

export default Accessories;



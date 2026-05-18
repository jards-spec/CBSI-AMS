import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Copy, Archive, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import ConsumableModal from '../components/ConsumableModal';
import TransactionModal from '../components/TransactionModal';
import { api } from '../lib/api';
import { formatPHP } from '../lib/currency';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

type Scope = 'active' | 'archived' | 'all';

const Consumables = () => {
  
  const confirmDialog = useConfirm();
const { currentUser } = useAuth();

  const [scope, setScope] = useState<Scope>('active');
  const [items, setItems] = useState<any[]>([]);
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
      const data = await api.consumables.list(nextScope);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load consumables:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(scope);
  }, [scope]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      [item.name, item.itemNo, item.modelNo, item.category, item.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [items, searchQuery]);

  const handleSave = async (formData: any) => {
    if (!formData.name?.trim() || Number(formData.total) <= 0 || Number(formData.unitCost) < 0) {
      console.warn('Item name is required. Stock must be greater than zero.');
      return;
    }

    try {
      if (editingItem) {
        await api.consumables.update(editingItem.id, formData);
      } else {
        await api.consumables.create(formData);
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
      await api.consumables.create({
        ...item,
        name: `${item.name} (COPY)`,
        remaining: item.total,
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleArchive = async (item: any) => {
    const ok = await confirmDialog({
  title: 'Archive Consumable',
  message: `Archive ${item.name}?`,
  confirmText: 'Archive',
  cancelText: 'Cancel',
  danger: true,
});
if (!ok) return;

    try {
      await api.consumables.archive(item.id, {
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
      await api.consumables.restore(item.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
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
      setSelectedItem(null);
      setTransactionMode(null);
    } catch (error: any) {
      console.warn(error.message);
    } finally {
      setTransactionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
          Syncing consumables...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Consumables Inventory
          </h1>
          <p className="text-[10px] italic text-slate-600 dark:text-slate-500">
            Compact View: backend-driven stock movement.
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
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500/50 dark:border-slate-800 dark:bg-[#0f121d] dark:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-red-700"
          >
            <Plus size={16} /> Add Supply
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#10141d] dark:shadow-2xl">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#1c2230]">
            <tr className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
              <th className="w-[18%] px-4 py-4">Name / Category</th>
              <th className="w-[15%] px-2 py-4">Model / Item No.</th>
              <th className="w-[15%] px-2 py-4">Location / Order</th>
              <th className="w-[10%] px-2 py-4">Purchase Date</th>
              <th className="w-[12%] px-2 py-4 text-center">Stock (Min/Tot/Rem)</th>
              <th className="w-[10%] px-2 py-4">Costs (Unit/Total)</th>
              <th className="w-[12%] px-2 py-4 text-center">Transactions</th>
              <th className="w-[8%] px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
            {filteredItems.map((item) => {
              const percent =
                Number(item.total || 0) > 0
                  ? (Number(item.remaining || 0) / Number(item.total || 0)) * 100
                  : 0;

              const totalCost = (Number(item.remaining || 0) * Number(item.unitCost || 0)).toFixed(2);
              const canCheckin = Number(item.remaining || 0) < Number(item.total || 0);
              const isArchived = Number(item.isArchived || 0) === 1;

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'text-[10px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/20',
                    isArchived && 'opacity-70',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-bold text-cyan-700 dark:text-cyan-500">
                        {item.name}
                      </div>
                      {isArchived ? (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-500">
                          Archived
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-bold uppercase text-slate-600 dark:text-slate-500">
                      <div
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          (item.category ?? '').includes('Ink')
                            ? 'bg-red-600 dark:bg-red-800'
                            : 'bg-purple-500 dark:bg-purple-600',
                        )}
                      />
                      {item.category}
                    </div>
                  </td>

                  <td className="px-2 py-3">
                    <div className="truncate font-medium text-slate-700 dark:text-slate-400">
                      {item.modelNo || '--'}
                    </div>
                    <div className="font-mono text-[9px] text-slate-500 dark:text-slate-600">
                      ID: {item.itemNo}
                    </div>
                  </td>

                  <td className="px-2 py-3">
                    <div className="font-medium text-cyan-700/80 dark:text-cyan-600/80">
                      {item.location || '--'}
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-600">
                      PO: {item.orderNumber || '--'}
                    </div>
                  </td>

                  <td className="px-2 py-3 text-slate-600 dark:text-slate-500">
                    <div className="font-medium">{item.purchaseDate}</div>
                  </td>

                  <td className="px-2 py-3">
                    <div className="mb-1 flex justify-center gap-2 font-bold">
                      <span className="text-slate-500 dark:text-slate-600">{item.minQty}</span>
                      <span className="text-slate-700 dark:text-slate-400">{item.total}</span>
                      <span className="text-slate-900 dark:text-white">{item.remaining}</span>
                    </div>
                    <div className="mx-auto h-1 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
                      <div
                        className={cn(
                          'h-full transition-all',
                          percent < 25 ? 'bg-orange-500' : 'bg-emerald-500',
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </td>

                  <td className="px-2 py-3">
                    <div className="font-medium text-slate-600 dark:text-slate-500">
                      Unit: {formatPHP(item.unitCost)}
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Total: {formatPHP(totalCost)}
                    </div>
                  </td>

                  <td className="px-2 py-3 text-center">
                    {!isArchived ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setTransactionMode('checkout');
                          }}
                          className="rounded-sm bg-[#d63384] px-3 py-1.5 text-[9px] font-black uppercase text-white transition-all hover:bg-[#b52a6f]"
                        >
                          Checkout
                        </button>

                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setTransactionMode('checkin');
                          }}
                          disabled={!canCheckin}
                          className="rounded-sm bg-emerald-600 px-3 py-1.5 text-[9px] font-black uppercase text-white transition-all disabled:opacity-30 hover:bg-emerald-700"
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

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {!isArchived ? (
                        <>
                          <button
                            onClick={() => handleClone(item)}
                            className="rounded-sm bg-cyan-500/10 p-1.5 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                          >
                            <Copy size={12} />
                          </button>

                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="rounded-sm bg-orange-500/10 p-1.5 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                          >
                            <Edit2 size={12} />
                          </button>

                          <button
                            onClick={() => handleArchive(item)}
                            className="rounded-sm bg-red-500/10 p-1.5 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <Archive size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(item)}
                          className="rounded-sm bg-emerald-500/10 p-1.5 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
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
                  colSpan={8}
                  className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600"
                >
                  No consumables found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <ConsumableModal
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
        resourceType="consumable"
        item={selectedItem}
        loading={transactionLoading}
        onClose={() => {
          if (transactionLoading) return;
          setSelectedItem(null);
          setTransactionMode(null);
        }}
        onSubmit={handleTransactionSubmit}
      />
    </div>
  );
};

export default Consumables;



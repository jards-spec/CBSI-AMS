import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Hash,
  Building,
  Copy,
  Edit2,
  Archive,
  RotateCcw,
  ChevronDown,
  Cpu,
  Mouse,
} from 'lucide-react';
import AssetModal from '../components/AssetModal';
import TransactionModal from '../components/TransactionModal';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { formatPHP } from '../lib/currency';
import { useAuth } from '../context/AuthContext';

interface AssetRecord {
  id: string;
  tag: string;
  name: string;
  category: string;
  status: string;
  assignedTo?: string | null;
  assignedEmployeeNumber?: string | null;
  employeeId?: string | null;
  serialNo?: string;
  modelNo?: string;
  manufacturer?: string;
  unitCost?: string | number;
  location?: string;
  purchaseDate?: string;
  notes?: string;
  isArchived?: number;
  archivedAt?: string | null;
  archivedById?: string | null;
  archivedByName?: string | null;
}

type Scope = 'active' | 'archived' | 'all';

const Assets = () => {
  const { currentUser } = useAuth();

  const [scope, setScope] = useState<Scope>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attachmentsByAsset, setAttachmentsByAsset] = useState<
    Record<string, { components: any[]; accessories: any[] }>
  >({});
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>({});
  const [loadingAttachments, setLoadingAttachments] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [transactionMode, setTransactionMode] = useState<'checkout' | 'checkin' | null>(null);
  const [saving, setSaving] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);

  const loadData = async (nextScope: Scope = scope) => {
    const [assetRows, employeeRows] = await Promise.all([
      api.assets.list(nextScope),
      api.employees.list('active'),
    ]);
    setAssets(assetRows);
    setEmployees(employeeRows);
  };

  useEffect(() => {
    loadData(scope).catch((error) => console.error('Failed to load assets:', error));
  }, [scope]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return assets.filter((asset) =>
      [
        asset.name,
        asset.tag,
        asset.modelNo,
        asset.serialNo,
        asset.assignedTo,
        asset.assignedEmployeeNumber,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [assets, searchQuery]);

  const getStatusStyles = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'deployed':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'maintenance':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'archived':
      case 'retired':
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const generateAssetTag = (category: string) => {
    const prefix =
      (category || 'AST').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AST';

    const highest = assets.reduce((max, asset) => {
      const match = asset.tag?.match(/(\d+)$/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0);

    return `CB-${prefix}-${String(highest + 1).padStart(4, '0')}`;
  };

  const loadAttachments = async (assetId: string) => {
    setLoadingAttachments((prev) => ({ ...prev, [assetId]: true }));
    try {
      const data = await api.assets.attachments(assetId);
      setAttachmentsByAsset((prev) => ({
        ...prev,
        [assetId]: {
          components: Array.isArray(data?.components) ? data.components : [],
          accessories: Array.isArray(data?.accessories) ? data.accessories : [],
        },
      }));
    } catch (error) {
      console.error('Failed to load asset attachments:', error);
      setAttachmentsByAsset((prev) => ({
        ...prev,
        [assetId]: { components: [], accessories: [] },
      }));
    } finally {
      setLoadingAttachments((prev) => ({ ...prev, [assetId]: false }));
    }
  };

  const toggleAssetExpansion = async (assetId: string) => {
    const nextExpanded = !expandedAssets[assetId];

    setExpandedAssets((prev) => ({
      ...prev,
      [assetId]: nextExpanded,
    }));

    if (nextExpanded && !attachmentsByAsset[assetId]) {
      await loadAttachments(assetId);
    }
  };

  const handleSaveAsset = async (data: any) => {
    setSaving(true);
    try {
      if (selectedAsset) {
        await api.assets.update(selectedAsset.id, {
          ...selectedAsset,
          ...data,
          employeeId: selectedAsset.employeeId ?? null,
        });
      } else {
        await api.assets.create({
          ...data,
          tag: generateAssetTag(data.category),
        });
      }

      await loadData();
      setIsModalOpen(false);
      setSelectedAsset(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloneAsset = async (asset: AssetRecord) => {
    try {
      await api.assets.create({
        ...asset,
        tag: generateAssetTag(asset.category),
        name: `${asset.name} (COPY)`,
        status: 'Available',
        employeeId: null,
      });
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleArchiveAsset = async (asset: AssetRecord) => {
    if (!window.confirm(`Archive ${asset.name}?`)) return;

    try {
      await api.assets.archive(asset.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRestoreAsset = async (asset: AssetRecord) => {
    try {
      await api.assets.restore(asset.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await loadData();
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

      await loadData();
      setTransactionMode(null);
      setSelectedAsset(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setTransactionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Asset Inventory
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-600 italic dark:text-slate-500">
            Management Console // {assets.length} Units Indexed
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={14}
            />
            <input
              type="text"
              placeholder="Filter assets, tag, model, or employee number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              setSelectedAsset(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all hover:bg-red-700"
          >
            <Plus size={16} strokeWidth={3} /> Register Asset
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
              <th className="px-6 py-5">Asset Details</th>
              <th className="px-6 py-5">Manufacturer / Model</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Financials</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
            {filteredAssets.map((asset) => {
              const isArchived = Number(asset.isArchived || 0) === 1;
              const isExpanded = !!expandedAssets[asset.id];
              const attachments = attachmentsByAsset[asset.id] || {
                components: [],
                accessories: [],
              };
              const attachmentCount =
                attachments.components.length + attachments.accessories.length;

              return (
                <React.Fragment key={asset.id}>
                  <tr
                    className={cn(
                      'group text-[11px] transition-colors hover:bg-slate-50 dark:hover:bg-white/1',
                      isArchived && 'opacity-70',
                    )}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAssetExpansion(asset.id)}
                          className="rounded-lg border border-slate-200 bg-slate-100 p-1 text-slate-600 transition-all hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <ChevronDown
                            size={12}
                            className={cn('transition-transform', isExpanded && 'rotate-180')}
                          />
                        </button>

                        <div className="font-bold uppercase italic tracking-tighter text-slate-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
                          {asset.name}
                        </div>

                        {isArchived ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-500">
                            Archived
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-slate-500 dark:text-slate-600">
                        <Hash size={10} /> {asset.tag}
                      </div>

                      <div className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                        Attached Items:{' '}
                        <span className="text-slate-900 dark:text-white">{attachmentCount}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 font-bold uppercase tracking-tighter text-slate-700 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Building size={12} /> {asset.manufacturer || 'Generic'}
                      </div>
                      <div className="mt-1 text-[9px] italic text-slate-500 dark:text-slate-600">
                        {asset.modelNo || 'N/A'}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-block rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-widest',
                            getStatusStyles(asset.status),
                          )}
                        >
                          {asset.status}
                        </span>
                      </div>

                      {asset.assignedTo ? (
                        <div className="mt-2 space-y-1">
                          <div className="text-[8px] font-bold uppercase italic text-slate-500 dark:text-slate-500">
                            To: {asset.assignedTo}
                          </div>

                          {asset.assignedEmployeeNumber ? (
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-600">
                              Employee No: {asset.assignedEmployeeNumber}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-6 py-5 font-bold italic text-emerald-500">
                      {formatPHP(asset.unitCost)}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {!isArchived ? (
                          <button
                            onClick={() => {
                              setSelectedAsset(asset);
                              setTransactionMode(
                                asset.status === 'Deployed' ? 'checkin' : 'checkout',
                              );
                            }}
                            className="rounded bg-[#d63384] px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter text-white shadow-lg shadow-pink-900/10 transition-all hover:bg-[#b52a6f]"
                          >
                            {asset.status === 'Deployed' ? 'Checkin' : 'Checkout'}
                          </button>
                        ) : null}

                        <div className="flex items-center gap-1.5">
                          {!isArchived ? (
                            <>
                              <button
                                onClick={() => handleCloneAsset(asset)}
                                className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                              >
                                <Copy size={12} strokeWidth={3} />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setIsModalOpen(true);
                                }}
                                className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-2 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                              >
                                <Edit2 size={12} />
                              </button>

                              <button
                                onClick={() => handleArchiveAsset(asset)}
                                className="rounded-lg border border-red-600/20 bg-red-600/10 p-2 text-red-600 transition-all hover:bg-red-600 hover:text-white"
                              >
                                <Archive size={12} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestoreAsset(asset)}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {isExpanded ? (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-6 py-5 dark:bg-[#0b0f19]">
                        {loadingAttachments[asset.id] ? (
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                            Loading attached parts...
                          </div>
                        ) : (
                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111624]">
                              <div className="mb-4 flex items-center gap-2">
                                <Cpu size={16} className="text-red-600" />
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                  Installed Components
                                </h3>
                              </div>

                              {attachments.components.length > 0 ? (
                                <div className="space-y-3">
                                  {attachments.components.map((component) => (
                                    <div
                                      key={component.id}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                                    >
                                      <div className="text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        {component.itemName}
                                      </div>
                                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">
                                        {component.category || 'Component'}{' '}
                                        {component.model ? `• ${component.model}` : ''}
                                      </div>
                                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">
                                        Qty: {component.quantity}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                                  No components installed
                                </p>
                              )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111624]">
                              <div className="mb-4 flex items-center gap-2">
                                <Mouse size={16} className="text-red-600" />
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                  Attached Accessories
                                </h3>
                              </div>

                              {attachments.accessories.length > 0 ? (
                                <div className="space-y-3">
                                  {attachments.accessories.map((accessory) => (
                                    <div
                                      key={accessory.id}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                                    >
                                      <div className="text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        {accessory.itemName}
                                      </div>
                                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">
                                        {accessory.category || 'Accessory'}{' '}
                                        {accessory.modelNo ? `• ${accessory.modelNo}` : ''}
                                      </div>
                                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">
                                        Qty: {accessory.quantity}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                                  No accessories attached
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}

            {filteredAssets.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600"
                >
                  No assets found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <AssetModal
          asset={selectedAsset}
          onClose={() => {
            if (saving) return;
            setIsModalOpen(false);
            setSelectedAsset(null);
          }}
          onSave={handleSaveAsset}
        />
      ) : null}

      <TransactionModal
        isOpen={!!transactionMode && !!selectedAsset}
        mode={transactionMode || 'checkout'}
        resourceType="asset"
        item={selectedAsset}
        employees={employees}
        loading={transactionLoading}
        onClose={() => {
          if (transactionLoading) return;
          setTransactionMode(null);
          setSelectedAsset(null);
        }}
        onSubmit={handleTransactionSubmit}
      />
    </div>
  );
};

export default Assets;
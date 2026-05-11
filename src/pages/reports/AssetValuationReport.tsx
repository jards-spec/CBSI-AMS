import React, { useEffect, useState } from 'react';
import {
  Download,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  PieChart,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

type AssetValuationData = {
  id: string;
  tag: string;
  name: string;
  category: string;
  status: string;
  unitCost: number;
  location: string;
  purchaseDate: string | null;
  ageInDays: number | null;
  ageInYears: number | null;
  purchaseYear: number | null;
  assignedTo: string | null;
  department: string | null;
  isArchived: number;
};

type Summary = {
  totalAssets: number;
  totalValue: number;
  averageAssetValue: number;
  byCategory: Record<string, { count: number; value: number }>;
  byDepartment: Record<string, { count: number; value: number }>;
  byStatus: Record<string, { count: number; value: number }>;
  byPurchaseYear: Record<string, { count: number; value: number }>;
  ageBrackets: Record<string, { count: number; value: number }>;
  currentYearPurchases: { count: number; value: number };
  previousYearPurchases: { count: number; value: number };
  unassignedAssets: number;
  deployedAssets: number;
};

const AssetValuationReport = () => {
  const [data, setData] = useState<AssetValuationData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'assets' | 'categories' | 'departments' | 'age'>('overview');

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reports.assetValuation();
      setData(result.report || []);
      setSummary(result.summary || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const exportToCSV = () => {
    const headers = [
      'Asset Tag',
      'Name',
      'Category',
      'Status',
      'Value',
      'Purchase Date',
      'Age (Years)',
      'Assigned To',
      'Department',
      'Location',
    ];

    const rows = data.map((r) => [
      r.tag,
      r.name,
      r.category,
      r.status,
      r.unitCost.toFixed(2),
      r.purchaseDate || 'N/A',
      r.ageInYears ?? 'N/A',
      r.assignedTo || 'Unassigned',
      r.department || 'Unassigned',
      r.location,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-valuation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Asset Valuation Report
          </h1>
          <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
            Track asset values, categories, departments, and age analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-lg transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-[#0f121d] dark:text-slate-300 dark:hover:bg-[#161b22]"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all active:scale-95 hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
        {(['overview', 'assets', 'categories', 'departments', 'age'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-wider transition-all',
              viewMode === mode
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
          <p className="text-sm font-bold text-red-500">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      )}

      {/* OVERVIEW VIEW */}
      {!loading && !error && viewMode === 'overview' && summary && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            <SummaryCard
              icon={<Package size={18} />}
              label="Total Assets"
              value={summary.totalAssets.toLocaleString()}
              color="cyan"
            />
            <SummaryCard
              icon={<span className="text-lg font-bold">₱</span>}
              label="Total Value"
              value={formatCurrency(summary.totalValue)}
              color="emerald"
            />
            <SummaryCard
              icon={<TrendingUp size={18} />}
              label="Avg Asset Value"
              value={formatCurrency(summary.averageAssetValue)}
              color="blue"
            />
            <SummaryCard
              icon={<CheckCircle size={18} />}
              label="Deployed"
              value={summary.deployedAssets.toLocaleString()}
              color="emerald"
              subtitle={`${Math.round((summary.deployedAssets / summary.totalAssets) * 100)}% utilization`}
            />
            <SummaryCard
              icon={<AlertCircle size={18} />}
              label="Unassigned"
              value={summary.unassignedAssets.toLocaleString()}
              color="orange"
            />
            <SummaryCard
              icon={<Calendar size={18} />}
              label={`Purchased ${new Date().getFullYear()}`}
              value={summary.currentYearPurchases.count.toLocaleString()}
              color="purple"
              subtitle={formatCurrency(summary.currentYearPurchases.value)}
            />
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                <PieChart size={16} /> Value by Category
              </h3>
              <div className="space-y-3">
                {Object.entries(summary.byCategory)
                  .sort((a, b) => b[1].value - a[1].value)
                  .map(([category, stats]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase text-slate-700 dark:text-slate-300">{category}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(stats.value)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${(stats.value / summary.totalValue) * 100}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500">{stats.count} assets</div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                <Users size={16} /> Value by Department
              </h3>
              <div className="space-y-3">
                {Object.entries(summary.byDepartment)
                  .sort((a, b) => b[1].value - a[1].value)
                  .slice(0, 8)
                  .map(([dept, stats]) => (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase text-slate-700 dark:text-slate-300">{dept}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(stats.value)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          style={{ width: `${(stats.value / summary.totalValue) * 100}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500">{stats.count} assets</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Age & Purchase Trends */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                <Clock size={16} /> Asset Age Distribution
              </h3>
              <div className="space-y-3">
                {Object.entries(summary.ageBrackets).map(([bracket, stats]) => (
                  <div key={bracket} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-white/5">
                    <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">{bracket}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] text-slate-500">{stats.count} assets</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                <BarChart3 size={16} /> Purchase Trends
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-4 dark:bg-emerald-500/5">
                  <div>
                    <div className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      Current Year ({new Date().getFullYear()})
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                      {summary.currentYearPurchases.count} assets purchased
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary.currentYearPurchases.value)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-blue-500/10 p-4 dark:bg-blue-500/5">
                  <div>
                    <div className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">
                      Previous Year ({new Date().getFullYear() - 1})
                    </div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300">
                      {summary.previousYearPurchases.count} assets purchased
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {formatCurrency(summary.previousYearPurchases.value)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-100 p-4 dark:bg-white/5">
                  <div>
                    <div className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400">
                      Year-over-Year Change
                    </div>
                  </div>
                  <div className="text-right">
                    {summary.previousYearPurchases.value > 0 ? (
                      <div
                        className={cn(
                          'text-lg font-black',
                          summary.currentYearPurchases.value >= summary.previousYearPurchases.value
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400',
                        )}
                      >
                        {summary.currentYearPurchases.value >= summary.previousYearPurchases.value ? '+' : ''}
                        {Math.round(
                          ((summary.currentYearPurchases.value - summary.previousYearPurchases.value) /
                            summary.previousYearPurchases.value) *
                            100,
                        )}
                        %
                      </div>
                    ) : (
                      <div className="text-lg font-black text-slate-600 dark:text-slate-400">N/A</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSETS TABLE VIEW */}
      {!loading && !error && viewMode === 'assets' && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Purchase Date</th>
                <th className="px-4 py-3 text-center">Age</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
              {data.map((asset) => (
                <tr key={asset.id} className="text-[10px] transition-colors hover:bg-slate-50 dark:hover:bg-white/2">
                  <td className="px-4 py-4 font-mono font-bold text-cyan-700 dark:text-cyan-400">{asset.tag}</td>
                  <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">{asset.name}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{asset.category}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase dark:bg-white/10">
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(asset.unitCost)}
                  </td>
                  <td className="px-4 py-4 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {formatDate(asset.purchaseDate)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {asset.ageInYears !== null ? (
                      <span className="font-mono text-slate-600 dark:text-slate-400">{asset.ageInYears}y</span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {asset.assignedTo || <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {asset.department || <span className="text-slate-400">Unassigned</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CATEGORIES VIEW */}
      {!loading && !error && viewMode === 'categories' && summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(summary.byCategory)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([category, stats]) => (
              <div
                key={category}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]"
              >
                <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {category}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Total Value</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(stats.value)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Asset Count</span>
                    <span className="font-bold text-slate-900 dark:text-white">{stats.count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Avg Value</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(stats.value / stats.count)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* DEPARTMENTS VIEW */}
      {!loading && !error && viewMode === 'departments' && summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(summary.byDepartment)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([dept, stats]) => (
              <div
                key={dept}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]"
              >
                <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {dept}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Total Value</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(stats.value)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Asset Count</span>
                    <span className="font-bold text-slate-900 dark:text-white">{stats.count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Avg Value</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(stats.value / stats.count)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* AGE VIEW */}
      {!loading && !error && viewMode === 'age' && summary && (
        <div className="space-y-4">
          {Object.entries(summary.ageBrackets).map(([bracket, stats]) => (
            <div
              key={bracket}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    {bracket}
                  </h3>
                  <p className="text-[10px] text-slate-500">{stats.count} assets in this age range</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(stats.value)}
                  </div>
                  <p className="text-[10px] text-slate-500">Total Value</p>
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className={cn(
                    'h-full transition-all',
                    bracket === '0-1 years'
                      ? 'bg-emerald-500'
                      : bracket === '1-3 years'
                      ? 'bg-cyan-500'
                      : bracket === '3-5 years'
                      ? 'bg-orange-500'
                      : bracket === '5+ years'
                      ? 'bg-red-500'
                      : 'bg-slate-500',
                  )}
                  style={{ width: `${(stats.value / summary.totalValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {!loading && !error && data.length === 0 && viewMode !== 'overview' && (
        <div className="flex flex-col items-center justify-center py-20">
          <Package size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">No assets found</p>
        </div>
      )}
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'red' | 'orange' | 'yellow' | 'emerald' | 'cyan' | 'blue' | 'slate' | 'purple';
  subtitle?: string;
}) => {
  const colorClasses = {
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  };

  return (
    <div className={cn('rounded-2xl border p-4', colorClasses[color])}>
      <div className="mb-2">{icon}</div>
      <div className="text-[20px] font-black tracking-tight">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      {subtitle && <div className="text-[8px] opacity-60">{subtitle}</div>}
    </div>
  );
};

export default AssetValuationReport;
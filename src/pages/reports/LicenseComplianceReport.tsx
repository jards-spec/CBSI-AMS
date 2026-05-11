import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

type LicenseComplianceData = {
  id: string;
  name: string;
  manufacturer: string;
  licensedEmail: string;
  expirationDate: string | null;
  daysUntilExpiration: number | null;
  expirationStatus: 'valid' | 'expiring_soon' | 'expiring_90' | 'expired';
  total: number;
  assigned: number;
  avail: number;
  utilization: number;
  unitCost: number;
  totalValue: number;
  assignedValue: number;
  isOverAllocated: boolean;
  isArchived: number;
};

type Summary = {
  totalLicenses: number;
  expiredCount: number;
  expiringSoonCount: number;
  expiring90Count: number;
  overAllocatedCount: number;
  totalValue: number;
  assignedValue: number;
  averageUtilization: number;
};

const LicenseComplianceReport = () => {
  const [data, setData] = useState<LicenseComplianceData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring' | 'overallocated' | 'low_utilization'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'expiration' | 'utilization' | 'value'>('expiration');

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reports.licenseCompliance();
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

  const filteredData = React.useMemo(() => {
    let filtered = [...data];

    if (filter === 'expired') {
      filtered = filtered.filter((r) => r.expirationStatus === 'expired');
    } else if (filter === 'expiring') {
      filtered = filtered.filter((r) => r.expirationStatus === 'expiring_soon' || r.expirationStatus === 'expiring_90');
    } else if (filter === 'overallocated') {
      filtered = filtered.filter((r) => r.isOverAllocated);
    } else if (filter === 'low_utilization') {
      filtered = filtered.filter((r) => r.utilization < 50);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'expiration') {
        if (a.daysUntilExpiration === null) return 1;
        if (b.daysUntilExpiration === null) return -1;
        return a.daysUntilExpiration - b.daysUntilExpiration;
      }
      if (sortBy === 'utilization') return b.utilization - a.utilization;
      if (sortBy === 'value') return b.totalValue - a.totalValue;
      return 0;
    });

    return filtered;
  }, [data, filter, sortBy]);

  const exportToCSV = () => {
    const headers = [
      'License Name',
      'Manufacturer',
      'Total Seats',
      'Assigned',
      'Available',
      'Utilization %',
      'Expiration Date',
      'Days Until Expiration',
      'Status',
      'Unit Cost',
      'Total Value',
      'Over Allocated',
    ];

    const rows = data.map((r) => [
      r.name,
      r.manufacturer,
      r.total,
      r.assigned,
      r.avail,
      r.utilization.toFixed(1),
      r.expirationDate || 'N/A',
      r.daysUntilExpiration ?? 'N/A',
      r.expirationStatus,
      r.unitCost.toFixed(2),
      r.totalValue.toFixed(2),
      r.isOverAllocated ? 'Yes' : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-compliance-${new Date().toISOString().split('T')[0]}.csv`;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'expiring_soon':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'expiring_90':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <AlertCircle size={14} />;
      case 'expiring_soon':
        return <AlertTriangle size={14} />;
      case 'expiring_90':
        return <Clock size={14} />;
      default:
        return <CheckCircle size={14} />;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-500';
    if (utilization >= 70) return 'text-orange-500';
    if (utilization >= 50) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            License Compliance & Expiration Report
          </h1>
          <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
            Monitor software license utilization, compliance violations, and expiration dates.
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

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          <SummaryCard
            icon={<AlertCircle size={18} />}
            label="Expired"
            value={summary.expiredCount}
            color="red"
            subtitle="Licenses"
          />
          <SummaryCard
            icon={<AlertTriangle size={18} />}
            label="Expiring Soon"
            value={summary.expiringSoonCount}
            color="orange"
            subtitle="≤30 days"
          />
          <SummaryCard
            icon={<Clock size={18} />}
            label="Expiring 90d"
            value={summary.expiring90Count}
            color="yellow"
            subtitle="31-90 days"
          />
          <SummaryCard
            icon={<AlertCircle size={18} />}
            label="Over-Allocated"
            value={summary.overAllocatedCount}
            color="red"
            subtitle="Compliance Risk"
          />
          <SummaryCard
            icon={<TrendingUp size={18} />}
            label="Avg Utilization"
            value={`${summary.averageUtilization.toFixed(0)}%`}
            color="cyan"
            subtitle="Across all licenses"
          />
          <SummaryCard
            icon={<span className="text-lg font-bold">₱</span>}
            label="Total Value"
            value={formatCurrency(summary.totalValue)}
            color="emerald"
            subtitle="All licenses"
          />
          <SummaryCard
            icon={<Users size={18} />}
            label="Assigned Value"
            value={formatCurrency(summary.assignedValue)}
            color="blue"
            subtitle="In use"
          />
          <SummaryCard
            icon={<CheckCircle size={18} />}
            label="Total Licenses"
            value={summary.totalLicenses}
            color="slate"
            subtitle="Active"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
          {(['all', 'expired', 'expiring', 'overallocated', 'low_utilization'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all',
                filter === value
                  ? 'bg-red-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
              )}
            >
              {value === 'all' ? 'All' : value.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
          {(['expiration', 'name', 'utilization', 'value'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              className={cn(
                'rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all',
                sortBy === value
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-500">
          {filteredData.length} of {data.length} licenses
        </span>
      </div>

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

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      )}

      {!loading && !error && filteredData.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3 text-center">Seats</th>
                <th className="px-4 py-3 text-center">Utilization</th>
                <th className="px-4 py-3">Expiration</th>
                <th className="px-4 py-3 text-center">Days Left</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Total Value</th>
                <th className="px-4 py-3 text-center">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
              {filteredData.map((license) => (
                <tr
                  key={license.id}
                  className={cn(
                    'text-[10px] transition-colors hover:bg-slate-50 dark:hover:bg-white/2',
                    license.isOverAllocated && 'bg-red-500/5 dark:bg-red-500/10',
                  )}
                >
                  <td className="px-4 py-4">
                    <div className="font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                      {license.name}
                    </div>
                    <div className="text-[9px] text-slate-500">{license.manufacturer}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {license.assigned} / {license.total}
                    </div>
                    <div className="text-[9px] text-slate-500">{license.avail} available</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className={cn('font-black', getUtilizationColor(license.utilization))}>
                      {license.utilization.toFixed(0)}%
                    </div>
                    <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={cn(
                          'h-full transition-all',
                          license.utilization >= 90
                            ? 'bg-red-500'
                            : license.utilization >= 70
                            ? 'bg-orange-500'
                            : license.utilization >= 50
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500',
                        )}
                        style={{ width: `${Math.min(license.utilization, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Calendar size={10} />
                      <span className="font-mono">{formatDate(license.expirationDate)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {license.daysUntilExpiration !== null ? (
                      <span
                        className={cn(
                          'font-mono font-bold',
                          license.daysUntilExpiration < 0
                            ? 'text-red-500'
                            : license.daysUntilExpiration <= 30
                            ? 'text-orange-500'
                            : license.daysUntilExpiration <= 90
                            ? 'text-yellow-500'
                            : 'text-emerald-500',
                        )}
                      >
                        {license.daysUntilExpiration > 0 ? '+' : ''}
                        {license.daysUntilExpiration}
                      </span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest',
                        getStatusColor(license.expirationStatus),
                      )}
                    >
                      {getStatusIcon(license.expirationStatus)}
                      {license.expirationStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {formatCurrency(license.unitCost)}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">
                    {formatCurrency(license.totalValue)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {license.isOverAllocated ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-red-500">
                        <AlertTriangle size={8} /> High
                      </span>
                    ) : license.utilization < 50 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-yellow-500">
                        <TrendingUp size={8} /> Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500">
                        <CheckCircle size={8} /> OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <CheckCircle size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            No licenses match your filter
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-2 text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-400"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
};

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
  color: 'red' | 'orange' | 'yellow' | 'emerald' | 'cyan' | 'blue' | 'slate';
  subtitle: string;
}) => {
  const colorClasses = {
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  };

  return (
    <div className={cn('rounded-2xl border p-4', colorClasses[color])}>
      <div className="mb-2">{icon}</div>
      <div className="text-[20px] font-black tracking-tight">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-[8px] opacity-60">{subtitle}</div>
    </div>
  );
};

export default LicenseComplianceReport;
import React, { useEffect, useState, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Printer,
  X,
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

const PRINT_STYLE = `
  @page {
    size: A4 landscape;
    margin: 10mm;
  }

  @media print {
    html, body, #root {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      background: #fff !important;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body * {
      visibility: hidden !important;
    }

    #print-region, #print-region * {
      visibility: visible !important;
    }

    #print-region {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 6mm !important;
      box-sizing: border-box !important;
      overflow: visible !important;
      background: #fff !important;
      color: #000 !important;
    }

    .no-print {
      display: none !important;
    }

    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }

    th, td {
      border: 1px solid #000 !important;
      padding: 5px !important;
      font-size: 9px !important;
    }

    th {
      background: #f0f0f0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

const LicenseComplianceReport = () => {
  const [data, setData] = useState<LicenseComplianceData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring' | 'overallocated' | 'low_utilization'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'expiration' | 'utilization' | 'value'>('expiration');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLE;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = item.expirationDate ? new Date(item.expirationDate) : null;
        if (!itemDate) return false;
        
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        
        return true;
      });
    }

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
  }, [data, filter, sortBy, startDate, endDate]);

  const buildPrintHtml = (tableHTML: string) => {
    const dateRangeText = startDate && endDate 
      ? `Date Range: ${startDate} to ${endDate}`
      : startDate 
      ? `From: ${startDate}`
      : endDate
      ? `To: ${endDate}`
      : 'All Dates';
    
    const summaryData = `Generated: ${new Date().toLocaleString()}  â€¢  ${dateRangeText}  â€¢  Total Licenses: ${filteredData.length}  â€¢  Expired: ${summary?.expiredCount || 0}  â€¢  Over-Allocated: ${summary?.overAllocatedCount || 0}`;
    
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>License Compliance Report</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; }
            h1 { font-size: 18px; margin: 0 0 8px 0; }
            .meta { font-size: 12px; margin-bottom: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; }
            th, td {
              border: 1px solid #000;
              padding: 6px 8px;
              font-size: 10px;
            }
            th { background: #f0f0f0; text-align: left; }
          </style>
        </head>
        <body>
          <h1>License Compliance & Expiration Report</h1>
          <div class="meta">${summaryData}</div>
          ${tableHTML}
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (filteredData.length === 0) {
      window.alert('No data to print. Please adjust your filters.');
      return;
    }

    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      window.alert('Popup blocked. Please allow popups for this site to print.');
      return;
    }

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>License Name</th>
            <th>Manufacturer</th>
            <th>Total Seats</th>
            <th>Assigned</th>
            <th>Utilization</th>
            <th>Expiration Date</th>
            <th>Days Left</th>
            <th>Status</th>
            <th>Total Value</th>
          </tr>
        </thead>
        <tbody>
          ${filteredData.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.manufacturer || 'N/A'}</td>
              <td>${item.total}</td>
              <td>${item.assigned}</td>
              <td>${item.utilization}%</td>
              <td>${item.expirationDate || 'N/A'}</td>
              <td>${item.daysUntilExpiration ?? 'N/A'}</td>
              <td>${item.expirationStatus}</td>
              <td>â‚±${item.totalValue.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(tableHTML));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 200);
    };
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

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilter('all');
    setSortBy('expiration');
  };

  const hasActiveFilters = startDate || endDate || filter !== 'all';

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Print Region - Hidden on Screen, Visible When Printing */}
      <div id="print-region" ref={printRef} className="hidden">
        <div className="mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold">License Compliance & Expiration Report</h1>
          <p className="text-xs mt-1">Generated: {new Date().toLocaleString()}</p>
          <p className="text-xs">
            {startDate && endDate 
              ? `Date Range: ${startDate} to ${endDate}`
              : startDate 
              ? `From: ${startDate}`
              : endDate
              ? `To: ${endDate}`
              : 'All Dates'}
            {'  â€¢  '}
            Total Licenses: {filteredData.length}
            {'  â€¢  '}
            Expired: {summary?.expiredCount || 0}
            {'  â€¢  '}
            Over-Allocated: {summary?.overAllocatedCount || 0}
          </p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-left">License Name</th>
              <th className="border border-black px-2 py-1 text-left">Manufacturer</th>
              <th className="border border-black px-2 py-1 text-center">Total</th>
              <th className="border border-black px-2 py-1 text-center">Assigned</th>
              <th className="border border-black px-2 py-1 text-center">Util %</th>
              <th className="border border-black px-2 py-1 text-left">Expiration</th>
              <th className="border border-black px-2 py-1 text-center">Days</th>
              <th className="border border-black px-2 py-1 text-left">Status</th>
              <th className="border border-black px-2 py-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((license) => (
              <tr key={license.id}>
                <td className="border border-black px-2 py-1">{license.name}</td>
                <td className="border border-black px-2 py-1">{license.manufacturer || 'N/A'}</td>
                <td className="border border-black px-2 py-1 text-center">{license.total}</td>
                <td className="border border-black px-2 py-1 text-center">{license.assigned}</td>
                <td className="border border-black px-2 py-1 text-center">{license.utilization}%</td>
                <td className="border border-black px-2 py-1">{license.expirationDate || 'N/A'}</td>
                <td className="border border-black px-2 py-1 text-center">{license.daysUntilExpiration ?? 'N/A'}</td>
                <td className="border border-black px-2 py-1">{license.expirationStatus}</td>
                <td className="border border-black px-2 py-1 text-right">â‚±{license.totalValue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t-2 border-black text-xs text-gray-600">
          <p>CentralBooks Vantage Asset Management System</p>
          <p>Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Screen View */}
      <div className="no-print">
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
              onClick={handlePrint}
              disabled={loading || filteredData.length === 0}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all active:scale-95 hover:bg-red-700 disabled:opacity-50"
            >
              <Printer size={14} /> Print
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

        {/* Date Range Filter */}
        <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
          <div className="flex items-start gap-3 mb-3">
            <Calendar size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Filter by Expiration Date Range
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select a date range to filter licenses by their expiration dates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg dark:border-slate-800 dark:bg-[#05070a]">
              <div className="flex shrink-0 items-center border-r border-slate-300 bg-slate-100 px-4 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
                From
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 bg-transparent px-4 py-3 text-xs text-slate-900 outline-none dark:text-white"
              />
              {startDate && (
                <button onClick={() => setStartDate('')} className="px-3 text-slate-600 hover:text-slate-900 dark:hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg dark:border-slate-800 dark:bg-[#05070a]">
              <div className="flex shrink-0 items-center border-r border-slate-300 bg-slate-100 px-4 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
                To
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 bg-transparent px-4 py-3 text-xs text-slate-900 outline-none dark:text-white"
              />
              {endDate && (
                <button onClick={() => setEndDate('')} className="px-3 text-slate-600 hover:text-slate-900 dark:hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-50 dark:border-slate-800 dark:text-red-500 dark:hover:bg-red-600/10"
                >
                  Clear Filters
                </button>
              )}
            </div>
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
              subtitle="â‰¤30 days"
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
              icon={<span className="text-lg font-bold">â‚±</span>}
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
              {hasActiveFilters ? 'No licenses match your filters' : 'No licenses found'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-2 text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-400"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
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


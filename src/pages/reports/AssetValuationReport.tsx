import React, { useEffect, useState, useRef } from 'react';
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
  Printer,
  X,
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
  yearOverYearChange: number;
  topEmployees: any[];
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

const AssetValuationReport = () => {
  const [data, setData] = useState<AssetValuationData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'assets' | 'categories' | 'departments' | 'age'>('overview');
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

  const filteredData = React.useMemo(() => {
    let filtered = [...data];

    // Filter by purchase date range
    if (startDate || endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = item.purchaseDate ? new Date(item.purchaseDate) : null;
        if (!itemDate) return false;
        
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        
        return true;
      });
    }

    return filtered;
  }, [data, startDate, endDate]);

  const buildPrintHtml = (tableHTML: string) => {
    const dateRangeText = startDate && endDate 
      ? `Date Range: ${startDate} to ${endDate}`
      : startDate 
      ? `From: ${startDate}`
      : endDate
      ? `To: ${endDate}`
      : 'All Dates';
    
    const summaryData = `Generated: ${new Date().toLocaleString()}  â€¢  ${dateRangeText}  â€¢  Total Assets: ${filteredData.length}  â€¢  Total Value: ${formatCurrency(summary?.totalValue || 0)}`;
    
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Asset Valuation Report</title>
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
          <h1>Asset Valuation Report</h1>
          <div class="meta">${summaryData}</div>
          ${tableHTML}
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (filteredData.length === 0) {
      console.warn('No data to print. Please adjust your filters.');
      return;
    }

    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      console.warn('Popup blocked. Please allow popups for this site to print.');
      return;
    }

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Tag</th>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Value</th>
            <th>Purchase Date</th>
            <th>Age</th>
            <th>Assigned To</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          ${filteredData.map(item => `
            <tr>
              <td>${item.tag}</td>
              <td>${item.name}</td>
              <td>${item.category}</td>
              <td>${item.status}</td>
              <td>â‚±${item.unitCost.toFixed(2)}</td>
              <td>${item.purchaseDate || 'N/A'}</td>
              <td>${item.ageInYears !== null ? item.ageInYears + 'y' : 'N/A'}</td>
              <td>${item.assignedTo || 'Unassigned'}</td>
              <td>${item.department || 'Unassigned'}</td>
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

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setViewMode('overview');
  };

  const hasActiveFilters = startDate || endDate;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Print Region */}
      <div id="print-region" ref={printRef} className="hidden">
        <div className="mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold">Asset Valuation Report</h1>
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
            Total Assets: {filteredData.length}
            {'  â€¢  '}
            Total Value: {formatCurrency(summary?.totalValue || 0)}
          </p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-left">Tag</th>
              <th className="border border-black px-2 py-1 text-left">Name</th>
              <th className="border border-black px-2 py-1 text-left">Category</th>
              <th className="border border-black px-2 py-1 text-center">Status</th>
              <th className="border border-black px-2 py-1 text-right">Value</th>
              <th className="border border-black px-2 py-1 text-left">Purchase Date</th>
              <th className="border border-black px-2 py-1 text-center">Age</th>
              <th className="border border-black px-2 py-1 text-left">Assigned To</th>
              <th className="border border-black px-2 py-1 text-left">Department</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((asset) => (
              <tr key={asset.id}>
                <td className="border border-black px-2 py-1">{asset.tag}</td>
                <td className="border border-black px-2 py-1">{asset.name}</td>
                <td className="border border-black px-2 py-1">{asset.category}</td>
                <td className="border border-black px-2 py-1 text-center">{asset.status}</td>
                <td className="border border-black px-2 py-1 text-right">â‚±{asset.unitCost.toFixed(2)}</td>
                <td className="border border-black px-2 py-1">{asset.purchaseDate || 'N/A'}</td>
                <td className="border border-black px-2 py-1 text-center">{asset.ageInYears !== null ? asset.ageInYears + 'y' : 'N/A'}</td>
                <td className="border border-black px-2 py-1">{asset.assignedTo || 'Unassigned'}</td>
                <td className="border border-black px-2 py-1">{asset.department || 'Unassigned'}</td>
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
                Filter by Purchase Date Range
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select a date range to filter assets by purchase date.
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
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              <SummaryCard
                icon={<Package size={18} />}
                label="Total Assets"
                value={summary.totalAssets}
                color="cyan"
              />
              <SummaryCard
                icon={<DollarSign size={18} />}
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
                value={summary.byStatus['Deployed']?.count || 0}
                color="emerald"
              />
              <SummaryCard
                icon={<AlertCircle size={18} />}
                label="Available"
                value={summary.byStatus['Available']?.count || 0}
                color="orange"
              />
              <SummaryCard
                icon={<Calendar size={18} />}
                label={`Purchased ${new Date().getFullYear()}`}
                value={summary.currentYearPurchases.count}
                color="purple"
                subtitle={formatCurrency(summary.currentYearPurchases.value)}
              />
            </div>

            {/* Category & Department Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  <PieChart size={16} /> Value by Category
                </h3>
                <div className="space-y-3">
                  {Object.entries(summary.byCategory)
                    .sort((a, b) => b[1].value - a[1].value)
                    .slice(0, 8)
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
          </div>
        )}

        {/* ASSETS VIEW */}
        {!loading && !error && viewMode === 'assets' && filteredData.length > 0 && (
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
                {filteredData.map((asset) => (
                  <tr key={asset.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-white/2">
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

        {/* Empty States */}
        {!loading && !error && filteredData.length === 0 && viewMode !== 'overview' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              {hasActiveFilters ? 'No assets match your filters' : 'No assets found'}
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

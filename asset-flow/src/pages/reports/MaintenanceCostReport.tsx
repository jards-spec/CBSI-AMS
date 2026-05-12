import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  Wrench,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Printer,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

type MaintenanceData = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  cost: number;
  submittedAt: string;
  month: number | null;
  year: number | null;
  assetId: string | null;
  assetTag: string | null;
  assetName: string | null;
  assetValue: number;
  assetCategory: string | null;
  category: string;
  costVsValue: number;
  isHighCost: boolean;
};

type AssetMaintenance = {
  assetId: string | null;
  assetTag: string | null;
  assetName: string | null;
  assetValue: number;
  assetCategory: string | null;
  maintenanceCount: number;
  totalCost: number;
  costVsValue: number;
  isHighCost: boolean;
  shouldReplace: boolean;
  tickets: any[];
};

type Summary = {
  totalRecords: number;
  totalCost: number;
  averageCostPerTicket: number;
  assetsWithMaintenance: number;
  highCostAssetsCount: number;
  shouldReplaceCount: number;
  byPriority: Record<string, { count: number; cost: number }>;
  byStatus: Record<string, { count: number; cost: number }>;
  byCategory: Record<string, { count: number; cost: number }>;
  trends: { month: string; year: number; monthNum: number; count: number; cost: number }[];
  currentYearCost: number;
  previousYearCost: number;
  yearOverYearChange: number;
  topCostlyAssets: AssetMaintenance[];
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

const MaintenanceCostReport = () => {
  const [data, setData] = useState<MaintenanceData[]>([]);
  const [assetsReport, setAssetsReport] = useState<AssetMaintenance[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'assets' | 'trends' | 'tickets'>('overview');
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
      const result = await api.reports.maintenanceCost();
      setData(result.report || []);
      setAssetsReport(result.assetsReport || []);
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

    // Filter by date range (submittedAt)
    if (startDate || endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = item.submittedAt ? new Date(item.submittedAt) : null;
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
    
    const summaryData = `Generated: ${new Date().toLocaleString()}  •  ${dateRangeText}  •  Total Tickets: ${filteredData.length}  •  Total Cost: ${formatCurrency(summary?.totalCost || 0)}`;
    
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Maintenance Cost Report</title>
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
          <h1>Maintenance Cost & Trend Report</h1>
          <div class="meta">${summaryData}</div>
          ${tableHTML}
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (filteredData.length === 0) {
      alert('No data to print. Please adjust your filters.');
      return;
    }

    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups for this site to print.');
      return;
    }

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Title</th>
            <th>Asset Tag</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Cost</th>
            <th>Cost vs Value</th>
            <th>Date Submitted</th>
          </tr>
        </thead>
        <tbody>
          ${filteredData.map(item => `
            <tr>
              <td>${item.id}</td>
              <td>${item.title}</td>
              <td>${item.assetTag || 'N/A'}</td>
              <td>${item.category}</td>
              <td>${item.priority}</td>
              <td>${item.status}</td>
              <td>₱${item.cost.toFixed(2)}</td>
              <td>${item.costVsValue.toFixed(1)}%</td>
              <td>${item.submittedAt}</td>
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'High':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setViewMode('overview');
  };

  const hasActiveFilters = startDate || endDate;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Print Region - Hidden on Screen, Visible When Printing */}
      <div id="print-region" ref={printRef} className="hidden">
        <div className="mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold">Maintenance Cost & Trend Report</h1>
          <p className="text-xs mt-1">Generated: {new Date().toLocaleString()}</p>
          <p className="text-xs">
            {startDate && endDate 
              ? `Date Range: ${startDate} to ${endDate}`
              : startDate 
              ? `From: ${startDate}`
              : endDate
              ? `To: ${endDate}`
              : 'All Dates'}
            {'  •  '}
            Total Tickets: {filteredData.length}
            {'  •  '}
            Total Cost: {formatCurrency(summary?.totalCost || 0)}
          </p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-left">Ticket ID</th>
              <th className="border border-black px-2 py-1 text-left">Title</th>
              <th className="border border-black px-2 py-1 text-left">Asset Tag</th>
              <th className="border border-black px-2 py-1 text-left">Category</th>
              <th className="border border-black px-2 py-1 text-center">Priority</th>
              <th className="border border-black px-2 py-1 text-center">Status</th>
              <th className="border border-black px-2 py-1 text-right">Cost</th>
              <th className="border border-black px-2 py-1 text-center">Cost vs Value</th>
              <th className="border border-black px-2 py-1 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((ticket) => (
              <tr key={ticket.id}>
                <td className="border border-black px-2 py-1">{ticket.id}</td>
                <td className="border border-black px-2 py-1">{ticket.title}</td>
                <td className="border border-black px-2 py-1">{ticket.assetTag || 'N/A'}</td>
                <td className="border border-black px-2 py-1">{ticket.category}</td>
                <td className="border border-black px-2 py-1 text-center">{ticket.priority}</td>
                <td className="border border-black px-2 py-1 text-center">{ticket.status}</td>
                <td className="border border-black px-2 py-1 text-right">₱{ticket.cost.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-center">{ticket.costVsValue.toFixed(1)}%</td>
                <td className="border border-black px-2 py-1">{ticket.submittedAt}</td>
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
              Maintenance Cost & Trend Report
            </h1>
            <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
              Track maintenance spending, identify costly assets, and analyze trends.
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
                Filter by Date Range
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select a date range to filter maintenance tickets by submission date.
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
          {(['overview', 'assets', 'trends', 'tickets'] as const).map((mode) => (
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
              <SummaryCard
                icon={<Wrench size={18} />}
                label="Total Tickets"
                value={summary.totalRecords}
                color="cyan"
              />
              <SummaryCard
                icon={<DollarSign size={18} />}
                label="Total Cost"
                value={formatCurrency(summary.totalCost)}
                color="red"
              />
              <SummaryCard
                icon={<DollarSign size={18} />}
                label="Avg per Ticket"
                value={formatCurrency(summary.averageCostPerTicket)}
                color="orange"
              />
              <SummaryCard
                icon={<Activity size={18} />}
                label="Assets Affected"
                value={summary.assetsWithMaintenance}
                color="blue"
              />
              <SummaryCard
                icon={<AlertTriangle size={18} />}
                label="High Cost"
                value={summary.highCostAssetsCount}
                color="orange"
                subtitle=">50% of value"
              />
              <SummaryCard
                icon={<AlertTriangle size={18} />}
                label="Replace"
                value={summary.shouldReplaceCount}
                color="red"
                subtitle=">100% of value"
              />
              <SummaryCard
                icon={<TrendingUp size={18} />}
                label="This Year"
                value={formatCurrency(summary.currentYearCost)}
                color="emerald"
              />
              <SummaryCard
                icon={summary.yearOverYearChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                label="YoY Change"
                value={`${summary.yearOverYearChange >= 0 ? '+' : ''}${summary.yearOverYearChange}%`}
                color={summary.yearOverYearChange >= 0 ? 'red' : 'emerald'}
              />
            </div>

            {/* Priority & Status Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  <BarChart3 size={16} /> By Priority
                </h3>
                <div className="space-y-3">
                  {Object.entries(summary.byPriority).map(([priority, stats]) => (
                    <div key={priority} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={cn('font-bold uppercase', getPriorityColor(priority))}>{priority}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(stats.cost)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className={cn(
                            'h-full',
                            priority === 'Critical'
                              ? 'bg-red-500'
                              : priority === 'High'
                              ? 'bg-orange-500'
                              : priority === 'Medium'
                              ? 'bg-yellow-500'
                              : 'bg-slate-500',
                          )}
                          style={{ width: `${(stats.cost / summary.totalCost) * 100}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500">{stats.count} tickets</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  <PieChart size={16} /> By Status
                </h3>
                <div className="space-y-3">
                  {Object.entries(summary.byStatus).map(([status, stats]) => (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase text-slate-700 dark:text-slate-300">{status}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(stats.cost)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className={cn(
                            'h-full',
                            status === 'Open'
                              ? 'bg-red-500'
                              : status === 'In Progress'
                              ? 'bg-orange-500'
                              : status === 'Resolved'
                              ? 'bg-emerald-500'
                              : 'bg-slate-500',
                          )}
                          style={{ width: `${(stats.cost / summary.totalCost) * 100}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500">{stats.count} tickets</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Costly Assets */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                <AlertTriangle size={16} /> Top 5 Costly Assets
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-400">Asset</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-400">Tickets</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-400">Maint. Cost</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-400">Asset Value</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-400">Cost %</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-400">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {summary.topCostlyAssets.map((asset) => (
                      <tr key={asset.assetId}>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{asset.assetTag}</div>
                          <div className="text-[9px] text-slate-500">{asset.assetName}</div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-900 dark:text-white">
                          {asset.maintenanceCount}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(asset.totalCost)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatCurrency(asset.assetValue)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={cn(
                              'font-mono font-bold',
                              asset.costVsValue > 100
                                ? 'text-red-500'
                                : asset.costVsValue > 50
                                ? 'text-orange-500'
                                : 'text-emerald-500',
                            )}
                          >
                            {asset.costVsValue.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {asset.shouldReplace ? (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-red-500">
                              Replace
                            </span>
                          ) : asset.isHighCost ? (
                            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-orange-500">
                              Review
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-500">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ASSETS VIEW */}
        {!loading && !error && viewMode === 'assets' && assetsReport.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3 text-center">Tickets</th>
                  <th className="px-4 py-3 text-right">Maint. Cost</th>
                  <th className="px-4 py-3 text-right">Asset Value</th>
                  <th className="px-4 py-3 text-center">Cost %</th>
                  <th className="px-4 py-3 text-center">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
                {assetsReport.map((asset) => (
                  <tr key={asset.assetId} className="text-[10px] hover:bg-slate-50 dark:hover:bg-white/2">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{asset.assetTag}</div>
                      <div className="text-[9px] text-slate-500">{asset.assetName}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-900 dark:text-white">
                      {asset.maintenanceCount}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(asset.totalCost)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(asset.assetValue)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={cn(
                          'font-mono font-bold',
                          asset.costVsValue > 100
                            ? 'text-red-500'
                            : asset.costVsValue > 50
                            ? 'text-orange-500'
                            : 'text-emerald-500',
                        )}
                      >
                        {asset.costVsValue.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {asset.shouldReplace ? (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-[8px] font-black uppercase text-red-500">
                          Replace
                        </span>
                      ) : asset.isHighCost ? (
                        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-[8px] font-black uppercase text-orange-500">
                          Review
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[8px] font-black uppercase text-emerald-500">
                          Maintain
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TRENDS VIEW */}
        {!loading && !error && viewMode === 'trends' && summary && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                <Calendar size={16} /> 12-Month Maintenance Spending Trend
              </h3>
              <div className="flex items-end justify-between gap-2 h-48">
                {summary.trends.map((trend, idx) => {
                  const maxCost = Math.max(...summary.trends.map((t) => t.cost));
                  const height = maxCost > 0 ? (trend.cost / maxCost) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center">
                        <div className="text-[8px] font-mono text-slate-500 mb-1">
                          {trend.cost > 0 ? formatCurrency(trend.cost) : '-'}
                        </div>
                        <div
                          className={cn(
                            'w-full rounded-t transition-all',
                            trend.cost > 0 ? 'bg-red-500' : 'bg-slate-200 dark:bg-white/10',
                          )}
                          style={{ height: `${Math.max(height, 4)}px`, minHeight: '4px' }}
                        />
                      </div>
                      <div className="text-[8px] font-bold uppercase text-slate-500 rotate-45 origin-top-left translate-y-2">
                        {trend.month.slice(0, 3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Year Comparison */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
                <div className="text-[10px] font-black uppercase text-slate-500">Previous Year</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(summary.previousYearCost)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
                <div className="text-[10px] font-black uppercase text-slate-500">Current Year</div>
                <div className="text-2xl font-black text-red-600 dark:text-red-500">
                  {formatCurrency(summary.currentYearCost)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
                <div className="text-[10px] font-black uppercase text-slate-500">Change</div>
                <div
                  className={cn(
                    'text-2xl font-black',
                    summary.yearOverYearChange >= 0 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500',
                  )}
                >
                  {summary.yearOverYearChange >= 0 ? '+' : ''}{summary.yearOverYearChange}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TICKETS VIEW */}
        {!loading && !error && viewMode === 'tickets' && filteredData.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-center">Cost %</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
                {filteredData.map((ticket) => (
                  <tr key={ticket.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-white/2">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{ticket.title}</div>
                      <div className="text-[9px] text-slate-500">{ticket.category}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono text-slate-700 dark:text-slate-300">{ticket.assetTag || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn('rounded-full px-2 py-0.5 text-[8px] font-black uppercase border', getPriorityColor(ticket.priority))}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase dark:bg-white/10">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(ticket.cost)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={cn(
                          'font-mono font-bold',
                          ticket.costVsValue > 100
                            ? 'text-red-500'
                            : ticket.costVsValue > 50
                            ? 'text-orange-500'
                            : 'text-emerald-500',
                        )}
                      >
                        {ticket.costVsValue.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                      {formatDate(ticket.submittedAt)}
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
            <Wrench size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              {hasActiveFilters ? 'No maintenance records match your filters' : 'No maintenance records found'}
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

export default MaintenanceCostReport;
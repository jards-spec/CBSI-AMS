import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  Calendar,
  Mail,
  Package,
  ShieldCheck,
  TrendingUp,
  Printer,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

type NotificationData = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  employeeEmail: string;
  department: string;
  type: 'ASSET_ASSIGNMENT' | 'LICENSE_ASSIGNMENT';
  title: string;
  message: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  createdAt: string;
  daysPending: number;
  isOverdue: boolean;
  urgency: 'critical' | 'high' | 'medium' | 'normal';
  metadata: {
    assetId?: string;
    assetTag?: string;
    assetName?: string;
    licenseId?: string;
    licenseName?: string;
    quantity?: number;
    assignedById?: string;
    assignedByName?: string;
  };
};

type Summary = {
  totalNotifications: number;
  pendingCount: number;
  confirmedCount: number;
  declinedCount: number;
  overdueCount: number;
  confirmationRate: number;
  byEmployee: any[];
  byDepartment: Record<string, { pendingCount: number; overdueCount: number }>;
  byType: Record<string, { count: number }>;
  byUrgency: Record<string, number>;
  topOverdueEmployees: any[];
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

const UnconfirmedAssignmentsReport = () => {
  const [data, setData] = useState<NotificationData[]>([]);
  const [pending, setPending] = useState<NotificationData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('pending');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'normal'>('all');
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
      const result = await api.reports.unconfirmedAssignments();
      setData(result.report || []);
      setPending(result.pending || []);
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

  const filteredData = data.filter((n) => {
    const matchesStatus = statusFilter === 'all' || n.status.toLowerCase() === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || n.urgency === urgencyFilter;
    return matchesStatus && matchesUrgency;
  });

  const buildPrintHtml = (tableHTML: string) => {
    const summaryData = `Generated: ${new Date().toLocaleString()}  •  Total: ${filteredData.length}  •  Pending: ${summary?.pendingCount || 0}  •  Overdue: ${summary?.overdueCount || 0}`;
    
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Unconfirmed Assignments Report</title>
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
          <h1>Unconfirmed Assignments Report</h1>
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
            <th>Employee</th>
            <th>Type</th>
            <th>Title</th>
            <th>Status</th>
            <th>Days Pending</th>
            <th>Urgency</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${filteredData.map(item => `
            <tr>
              <td>${item.employeeName}</td>
              <td>${item.type.replace('_', ' ')}</td>
              <td>${item.title}</td>
              <td>${item.status}</td>
              <td>${item.daysPending}</td>
              <td>${item.urgency}</td>
              <td>${item.createdAt}</td>
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'CONFIRMED':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'DECLINED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock size={12} />;
      case 'CONFIRMED':
        return <CheckCircle size={12} />;
      case 'DECLINED':
        return <XCircle size={12} />;
      default:
        return <Clock size={12} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Print Region */}
      <div id="print-region" ref={printRef} className="hidden">
        <div className="mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold">Unconfirmed Assignments Report</h1>
          <p className="text-xs mt-1">Generated: {new Date().toLocaleString()}</p>
          <p className="text-xs">Total: {filteredData.length}  •  Pending: {summary?.pendingCount || 0}  •  Overdue: {summary?.overdueCount || 0}</p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-left">Employee</th>
              <th className="border border-black px-2 py-1 text-left">Type</th>
              <th className="border border-black px-2 py-1 text-left">Title</th>
              <th className="border border-black px-2 py-1 text-center">Status</th>
              <th className="border border-black px-2 py-1 text-center">Days</th>
              <th className="border border-black px-2 py-1 text-center">Urgency</th>
              <th className="border border-black px-2 py-1 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((n) => (
              <tr key={n.id}>
                <td className="border border-black px-2 py-1">{n.employeeName}</td>
                <td className="border border-black px-2 py-1">{n.type.replace('_', ' ')}</td>
                <td className="border border-black px-2 py-1">{n.title}</td>
                <td className="border border-black px-2 py-1 text-center">{n.status}</td>
                <td className="border border-black px-2 py-1 text-center">{n.daysPending}</td>
                <td className="border border-black px-2 py-1 text-center">{n.urgency}</td>
                <td className="border border-black px-2 py-1">{n.createdAt}</td>
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
              Unconfirmed Assignments Report
            </h1>
            <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
              Track pending asset and license confirmations with overdue alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading || data.length === 0}
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            {(['all', 'pending', 'confirmed', 'declined'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all',
                  statusFilter === status
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            {(['all', 'critical', 'high', 'medium', 'normal'] as const).map((urgency) => (
              <button
                key={urgency}
                onClick={() => setUrgencyFilter(urgency)}
                className={cn(
                  'rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all',
                  urgencyFilter === urgency
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
                )}
              >
                {urgency}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-slate-500">
            {filteredData.length} of {data.length} notifications
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
            <p className="text-sm font-bold text-red-500">{error}</p>
            <button onClick={refresh} className="mt-2 text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300">
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

        {/* Summary Cards */}
        {!loading && !error && summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            <SummaryCard
              icon={<Bell size={18} />}
              label="Total Notifications"
              value={summary.totalNotifications}
              color="cyan"
            />
            <SummaryCard
              icon={<Clock size={18} />}
              label="Pending"
              value={summary.pendingCount}
              color="orange"
            />
            <SummaryCard
              icon={<CheckCircle size={18} />}
              label="Confirmed"
              value={summary.confirmedCount}
              color="emerald"
            />
            <SummaryCard
              icon={<XCircle size={18} />}
              label="Declined"
              value={summary.declinedCount}
              color="red"
            />
            <SummaryCard
              icon={<AlertCircle size={18} />}
              label="Overdue (>7 days)"
              value={summary.overdueCount}
              color="red"
              subtitle="Critical"
            />
            <SummaryCard
              icon={<TrendingUp size={18} />}
              label="Confirmation Rate"
              value={`${summary.confirmationRate}%`}
              color="blue"
            />
          </div>
        )}

        {/* Urgency Breakdown */}
        {!loading && !error && summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <UrgencyCard label="Critical" value={summary.byUrgency.critical || 0} color="red" subtitle="7+ days" />
            <UrgencyCard label="High" value={summary.byUrgency.high || 0} color="orange" subtitle="4-7 days" />
            <UrgencyCard label="Medium" value={summary.byUrgency.medium || 0} color="yellow" subtitle="2-3 days" />
            <UrgencyCard label="Normal" value={summary.byUrgency.normal || 0} color="slate" subtitle="0-1 days" />
          </div>
        )}

        {/* Notifications Table */}
        {!loading && !error && filteredData.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3 text-center">Urgency</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
                {filteredData.map((n) => (
                  <tr
                    key={n.id}
                    className={cn(
                      'text-[10px] transition-colors hover:bg-slate-50 dark:hover:bg-white/2',
                      n.isOverdue && 'bg-red-500/5 dark:bg-red-500/10',
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{n.employeeName}</div>
                      <div className="text-[9px] font-mono text-slate-500">{n.employeeNumber}</div>
                      <div className="text-[9px] text-slate-400">{n.department}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {n.type === 'ASSET_ASSIGNMENT' ? (
                          <Package size={12} className="text-cyan-500" />
                        ) : (
                          <ShieldCheck size={12} className="text-purple-500" />
                        )}
                        <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400">
                          {n.type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-slate-700 dark:text-slate-300">{n.title}</div>
                      {n.metadata.assetTag && (
                        <div className="text-[9px] font-mono text-slate-500">{n.metadata.assetTag}</div>
                      )}
                      {n.metadata.licenseName && (
                        <div className="text-[9px] text-slate-500">{n.metadata.licenseName}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase', getStatusColor(n.status))}>
                        {getStatusIcon(n.status)}
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={cn(
                          'font-mono font-bold',
                          n.daysPending > 7
                            ? 'text-red-500'
                            : n.daysPending > 3
                            ? 'text-orange-500'
                            : n.daysPending > 1
                            ? 'text-yellow-500'
                            : 'text-emerald-500',
                        )}
                      >
                        {n.daysPending}d
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase', getUrgencyColor(n.urgency))}>
                        {n.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                      {formatDate(n.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">No notifications found</p>
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

// Urgency Card Component
const UrgencyCard = ({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  color: 'red' | 'orange' | 'yellow' | 'slate';
  subtitle: string;
}) => {
  const colorClasses = {
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  };

  return (
    <div className={cn('rounded-2xl border p-4', colorClasses[color])}>
      <div className="text-[20px] font-black tracking-tight">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-[8px] opacity-60">{subtitle}</div>
    </div>
  );
};

export default UnconfirmedAssignmentsReport;
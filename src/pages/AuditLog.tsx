import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Search,
  Trash2,
  Printer,
  ShieldAlert,
  Clock,
  User,
  Tag,
  FileText,
  X,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useConfirm } from '../context/ConfirmContext';

type LogType =
  | 'ADDED'
  | 'UPDATED'
  | 'DELETED'
  | 'CHECKOUT'
  | 'CHECKIN'
  | 'INFO'
  | 'ISSUE'
  | 'REQUESTED'
  | 'REGISTERED'
  | 'CLONED'
  | 'ARCHIVED'
  | 'RESTORED';

interface AuditLogItem {
  id: string;
  timestamp: string;
  createdAt?: string;
  type: LogType | string;
  entity: string;
  message: string;
  user: string;
}

const ALL_TYPES = [
  'ALL',
  'ADDED',
  'UPDATED',
  'DELETED',
  'ARCHIVED',
  'RESTORED',
  'CHECKOUT',
  'CHECKIN',
  'REQUESTED',
  'REGISTERED',
  'CLONED',
  'ISSUE',
  'INFO',
];

const getBadgeStyle = (type: string) => {
  switch (type) {
    case 'ADDED':
    case 'REGISTERED':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400';
    case 'UPDATED':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400';
    case 'DELETED':
      return 'bg-red-600/10 text-red-600 border-red-600/30 dark:text-red-400';
    case 'ARCHIVED':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400';
    case 'RESTORED':
      return 'bg-teal-500/10 text-teal-600 border-teal-500/30 dark:text-teal-400';
    case 'CHECKOUT':
    case 'ISSUE':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400';
    case 'CHECKIN':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400';
    case 'REQUESTED':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400';
    case 'CLONED':
      return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 dark:text-cyan-400';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/50';
  }
};

const PRINT_STYLE = `
  @page {
    size: A4 landscape;
    margin: 0;
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

    .print-card,
    .print-section,
    .print-row {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      box-shadow: none !important;
      overflow: visible !important;
      border-radius: 0 !important;
    }

    .print-only {
  display: block !important;
}

.screen-only {
  display: none !important;
}

.print-simple-table th,
.print-simple-table td {
  font-size: 10px !important;
  line-height: 1.25 !important;
  padding: 4px 6px !important;
}

    .print-section {
      margin: 0 0 4mm 0 !important;
      border: 1px solid #ddd !important;
    }

    .print-section table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
    }

    thead {
      display: table-header-group !important;
    }

    tr, th, td {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      vertical-align: top !important;
    }

    th, td {
      padding: 5px 7px !important;
      font-size: 9px !important;
      line-height: 1.25 !important;
    }

    th:nth-child(1), td:nth-child(1) { width: 21% !important; }
    th:nth-child(2), td:nth-child(2) { width: 18% !important; }
    th:nth-child(3), td:nth-child(3) { width: 21% !important; }
    th:nth-child(4), td:nth-child(4) { width: 40% !important; }

    .truncate {
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: normal !important;
      word-break: break-word !important;
    }
  }
`;

const getLogDate = (log: AuditLogItem) => {
  const raw = log.createdAt || log.timestamp;
  if (!raw) return null;

  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLogTimestamp = (log: AuditLogItem) => {
  const raw = log.createdAt || log.timestamp;
  if (!raw) return '-';

  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

export default function AuditLog() {
  
  const confirmDialog = useConfirm();
const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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
    try {
      const data = await api.audit.list();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleClear = async () => {
    const ok = await confirmDialog({
  title: 'Wipe Audit Logs',
  message: 'Permanently wipe all audit logs? This cannot be undone.',
  confirmText: 'Wipe',
  cancelText: 'Cancel',
  danger: true,
});
if (!ok) return;
    try {
      await api.audit.clear();
      await refresh();
    } catch (err) {
      console.error('Failed to clear audit logs:', err);
    }
  };

  const filteredLogs = useMemo(() => {
    const filtered = logs.filter((log) => {
      const q = search.toLowerCase();

      const matchesSearch =
        (log.entity ?? '').toLowerCase().includes(q) ||
        (log.message ?? '').toLowerCase().includes(q) ||
        (log.user ?? '').toLowerCase().includes(q) ||
        (log.type ?? '').toLowerCase().includes(q);

      const matchesType = activeType === 'ALL' || log.type === activeType;

      const logDate = getLogDate(log);
      const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

      const matchesDate =
        (!start || (logDate && logDate >= start)) &&
        (!end || (logDate && logDate <= end));

      return matchesSearch && matchesType && matchesDate;
    });

    filtered.sort((a, b) => {
      const dateA = getLogDate(a)?.getTime() ?? 0;
      const dateB = getLogDate(b)?.getTime() ?? 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [logs, search, activeType, startDate, endDate, sortOrder]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, AuditLogItem[]> = {};
    filteredLogs.forEach((log) => {
      const key = log.type || 'INFO';
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const rangeReadyForPrint = Boolean(startDate && endDate);

  const summaryStats = useMemo(() => {
    return {
      total: filteredLogs.length,
      added: filteredLogs.filter((log) => log.type === 'ADDED' || log.type === 'REGISTERED').length,
      updated: filteredLogs.filter((log) => log.type === 'UPDATED').length,
      deleted: filteredLogs.filter((log) => log.type === 'DELETED').length,
      archived: filteredLogs.filter((log) => log.type === 'ARCHIVED').length,
      restored: filteredLogs.filter((log) => log.type === 'RESTORED').length,
    };
  }, [filteredLogs]);

  const printSummary = [
    `Date Range: ${startDate} to ${endDate}`,
    activeType !== 'ALL' ? `Category: ${activeType}` : 'All Categories',
    `Sort: ${sortOrder === 'newest' ? 'Latest First' : 'Oldest First'}`,
    `Entries: ${filteredLogs.length}`,
  ].join('  â€¢  ');

  const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildPrintHtml = () => {
  const rows = filteredLogs
    .map(
      (log) => `
      <tr>
        <td>${escapeHtml(formatLogTimestamp(log))}</td>
        <td>${escapeHtml(log.type || '')}</td>
        <td>${escapeHtml(log.entity || '-')}</td>
        <td>${escapeHtml(log.message || '-')}</td>
        <td>${escapeHtml(log.user || 'SYSTEM')}</td>
      </tr>
    `,
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Audit Report</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; color: #111; margin: 0; }
          h1 { font-size: 18px; margin: 0 0 8px 0; }
          .meta { font-size: 12px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            font-size: 11px;
            vertical-align: top;
            word-break: break-word;
          }
          th { background: #f3f4f6; text-align: left; }
          th:nth-child(1), td:nth-child(1) { width: 16%; }
          th:nth-child(2), td:nth-child(2) { width: 12%; }
          th:nth-child(3), td:nth-child(3) { width: 20%; }
          th:nth-child(4), td:nth-child(4) { width: 37%; }
          th:nth-child(5), td:nth-child(5) { width: 15%; }
        </style>
      </head>
      <body>
        <h1>CentralBooks Vantage Audit Report</h1>
        <div class="meta">Date Range: ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</div>
        <div class="meta">Entries: ${filteredLogs.length}</div>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Type</th>
              <th>Entity</th>
              <th>Details</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
};

  const handlePrint = () => {
  if (!rangeReadyForPrint) {
    alert('Please select both a From date and a To date before printing.');
    return;
  }

  if (filteredLogs.length === 0) {
    alert('There are no audit log entries inside the selected date range.');
    return;
  }

  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) {
    alert('Popup blocked. Please allow popups for this site to print.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintHtml());
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 200);
  };
};

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
          Loading Audit Trail...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="no-print flex flex-col items-start justify-between gap-6 border-b border-slate-300 pb-8 md:flex-row md:items-end dark:border-slate-800/60">
        <div>
          <h1 className="flex items-center gap-4 text-4xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">
            <Activity className="text-red-600" size={32} />
            System <span className="text-red-600">Audit Trail</span>
          </h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">
            CentralBooks Vantage // {logs.length} Total Entries
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95',
              sortOrder === 'newest'
                ? 'border-red-500 bg-red-600 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-[#0f121d] dark:text-slate-300 dark:hover:border-slate-500',
            )}
          >
            <ArrowUpDown size={14} /> {sortOrder === 'newest' ? 'Latest First' : 'Oldest First'}
          </button>

          <button
            onClick={handlePrint}
            disabled={!rangeReadyForPrint || filteredLogs.length === 0}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95',
              rangeReadyForPrint && filteredLogs.length > 0
                ? 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-[#0f121d] dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'
                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600',
            )}
          >
            <Printer size={14} /> Print Date-Range Report
          </button>

          <button
            onClick={handleClear}
            className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-2xl transition-all active:scale-95 hover:border-red-300 hover:text-red-600 dark:border-slate-800 dark:bg-[#0f121d] dark:hover:border-red-900/50 dark:hover:text-red-500"
          >
            <Trash2 size={14} className="transition-transform group-hover:rotate-12" />
            Wipe Ledger
          </button>
        </div>
      </div>

      <div className="no-print rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <Calendar size={18} className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" />
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Print requirement
            </p>
            <p className="mt-1 text-xs text-blue-700/90 dark:text-blue-300/90">
              The audit report now prints only when both a <strong>From</strong> date and a <strong>To</strong> date are selected.
            </p>
          </div>
        </div>
      </div>

      <div className="no-print space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search entity, message, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-xs font-bold uppercase tracking-wider text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-red-500 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:placeholder:text-slate-700"
            />
          </div>

          <div className="flex overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            <div className="flex shrink-0 items-center border-r border-slate-300 bg-slate-100 px-4 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
              From
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3.5 text-xs text-slate-900 outline-none dark:text-white"
            />
            {startDate && (
              <button onClick={() => setStartDate('')} className="px-3 text-slate-600 hover:text-slate-900 dark:hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            <div className="flex shrink-0 items-center border-r border-slate-300 bg-slate-100 px-4 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
              To
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3.5 text-xs text-slate-900 outline-none dark:text-white"
            />
            {endDate && (
              <button onClick={() => setEndDate('')} className="px-3 text-slate-600 hover:text-slate-900 dark:hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                'rounded-xl border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all',
                activeType === type
                  ? 'border-red-500 bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-[#0f121d] dark:text-slate-500 dark:hover:border-slate-700 dark:hover:text-slate-300',
              )}
            >
              {type}
              {type !== 'ALL' && (
                <span className="ml-2 opacity-60">{logs.filter((l) => l.type === type).length}</span>
              )}
            </button>
          ))}

          {(search || startDate || endDate || activeType !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStartDate('');
                setEndDate('');
                setActiveType('ALL');
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-50 dark:border-slate-800 dark:text-red-500 dark:hover:bg-red-600/10"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="no-print flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-800/50" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-600">
          {filteredLogs.length} Entries {sortOrder === 'newest' ? '(Latest First)' : '(Oldest First)'}
        </span>
        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-800/50" />
      </div>

      <div id="print-region" ref={printRef}>
        <div className="print-only hidden">
  <div className="mb-4 border-b border-slate-300 pb-3">
    <h1 className="text-lg font-black uppercase tracking-wide">
      CentralBooks Vantage Audit Report
    </h1>
    <p className="mt-1 text-xs">Date Range: {startDate} to {endDate}</p>
    <p className="text-xs">Entries: {filteredLogs.length}</p>
  </div>

  <table className="print-simple-table w-full border-collapse text-left text-xs">
    <thead>
      <tr>
        <th className="border border-slate-300 px-2 py-1">Timestamp</th>
        <th className="border border-slate-300 px-2 py-1">Type</th>
        <th className="border border-slate-300 px-2 py-1">Entity</th>
        <th className="border border-slate-300 px-2 py-1">Details</th>
        <th className="border border-slate-300 px-2 py-1">User</th>
      </tr>
    </thead>
    <tbody>
      {filteredLogs.map((log) => (
        <tr key={log.id}>
          <td className="border border-slate-300 px-2 py-1">{formatLogTimestamp(log)}</td>
          <td className="border border-slate-300 px-2 py-1">{log.type}</td>
          <td className="border border-slate-300 px-2 py-1">{log.entity || '-'}</td>
          <td className="border border-slate-300 px-2 py-1">{log.message || '-'}</td>
          <td className="border border-slate-300 px-2 py-1">{log.user || 'SYSTEM'}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
        <div className="hidden print:block">
          <div className="print-card mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-900 px-6 py-7 text-white">
                            <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <Activity size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">
                    CentralBooks Vantage Audit Report
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                    Filtered Date Range Print View
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-[11px] font-bold tracking-wide text-white/90">
                {printSummary}
              </div>
            </div>

                  <div className="grid grid-cols-3 gap-4 px-6 py-6">              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Total Entries
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  {summaryStats.total}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Archive Events
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-amber-600">
                  {summaryStats.archived}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Restore Events
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-teal-600">
                  {summaryStats.restored}
                  <div className="screen-only">
                 {/* existing fancy content */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {Object.keys(groupedLogs).length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-slate-300 bg-slate-50 py-32 text-center dark:border-slate-800 dark:bg-[#0a0c14]">
            <ShieldAlert className="mx-auto mb-6 text-slate-400 dark:text-slate-800" size={64} />
            <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 italic dark:text-slate-600">
              No Matching Logs Found
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([type, entries]) => (
              <div
                key={type}
                className="print-card print-section overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d]"
              >
                <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-8 py-5 dark:border-slate-800 dark:bg-[#161b29]">
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        'inline-block rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] italic',
                        getBadgeStyle(type),
                      )}
                    >
                      {type}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest italic text-slate-500">
                      {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
                    </span>
                  </div>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 dark:border-slate-800/50 dark:text-slate-500">
                      <th className="px-8 py-4">Timestamp</th>
                      <th className="px-8 py-4">Operator</th>
                      <th className="px-8 py-4">Entity</th>
                      <th className="px-8 py-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                    {entries.map((log, index) => (
                      <tr
                        key={log.id}
                        className={cn(
                          'print-row group transition-colors hover:bg-slate-50 dark:hover:bg-white/2',
                          index % 2 === 1 ? 'bg-slate-50/70 dark:bg-transparent' : '',
                        )}
                      >
                        <td className="whitespace-nowrap px-8 py-4">
                          <div className="flex items-center gap-3 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            <Clock size={12} className="shrink-0 text-red-600/60 transition-colors group-hover:text-red-600" />
                            {formatLogTimestamp(log)}
                          </div>
                        </td>

                        <td className="px-8 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                              <User size={12} className="text-slate-600" />
                            </div>
                            <span className="text-xs font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                              {log.user || 'SYSTEM'}
                            </span>
                          </div>
                        </td>

                        <td className="px-8 py-4">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                            <Tag size={11} className="shrink-0 text-red-600/40" />
                            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 dark:border-slate-800/50 dark:bg-slate-900/50">
                              {log.entity || 'â€”'}
                            </span>
                          </div>
                        </td>

                        <td className="max-w-xs px-8 py-4 xl:max-w-md">
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase italic tracking-tight text-slate-600 dark:text-slate-400">
                            <FileText size={12} className="shrink-0 text-slate-500 transition-colors group-hover:text-red-600/50 dark:text-slate-700" />
                            <span className="truncate">{log.message || 'â€”'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 hidden border-t-2 border-slate-900 pt-5 text-center print:block">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500">
            CentralBooks Vantage Asset Management System â€” Confidential Report
          </p>
        </div>
      </div>

      <div className="no-print flex justify-center">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] italic text-slate-400 dark:text-slate-700">
          --- End of Audit Registry ---
        </p>
      </div>
    </div>
  );
}

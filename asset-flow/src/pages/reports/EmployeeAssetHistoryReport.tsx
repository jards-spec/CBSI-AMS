import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  Users,
  Package,
  ShieldCheck,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Building2,
  Printer,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

type EmployeeData = {
  id: string;
  name: string;
  employeeNumber: string;
  email: string;
  department: string;
  role: string;
  assetCount: number;
  totalAssetValue: number;
  licenseCount: number;
  totalLicenseValue: number;
  totalValue: number;
  pendingConfirmations: number;
  confirmedCount: number;
  declinedCount: number;
  assets: any[];
  licenses: any[];
};

type Summary = {
  totalEmployees: number;
  totalAssetsAssigned: number;
  totalLicensesAssigned: number;
  totalValueAssigned: number;
  averageValuePerEmployee: number;
  employeesWithPendingConfirmations: number;
  topEmployees: EmployeeData[];
  byDepartment: Record<string, { employeeCount: number; totalValue: number; assetCount: number; licenseCount: number }>;
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

const EmployeeAssetHistoryReport = () => {
  const [data, setData] = useState<EmployeeData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
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
      const result = await api.reports.employeeAssetHistory();
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

  const filteredData = data.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const departments = ['All', ...Array.from(new Set(data.map((e) => e.department).filter(Boolean)))];

  const buildPrintHtml = (tableHTML: string) => {
    const summaryData = `Generated: ${new Date().toLocaleString()}  •  Total Employees: ${filteredData.length}  •  Total Value: ${formatCurrency(summary?.totalValueAssigned || 0)}`;
    
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Employee Asset History Report</title>
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
          <h1>Employee Asset History Report</h1>
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
            <th>Employee Name</th>
            <th>Employee Number</th>
            <th>Department</th>
            <th>Assets</th>
            <th>Asset Value</th>
            <th>Licenses</th>
            <th>License Value</th>
            <th>Total Value</th>
          </tr>
        </thead>
        <tbody>
          ${filteredData.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.employeeNumber}</td>
              <td>${item.department}</td>
              <td>${item.assetCount}</td>
              <td>₱${item.totalAssetValue.toFixed(2)}</td>
              <td>${item.licenseCount}</td>
              <td>₱${item.totalLicenseValue.toFixed(2)}</td>
              <td>₱${item.totalValue.toFixed(2)}</td>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Print Region */}
      <div id="print-region" ref={printRef} className="hidden">
        <div className="mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold">Employee Asset History Report</h1>
          <p className="text-xs mt-1">Generated: {new Date().toLocaleString()}</p>
          <p className="text-xs">Total Employees: {filteredData.length}  •  Total Value: {formatCurrency(summary?.totalValueAssigned || 0)}</p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-left">Employee</th>
              <th className="border border-black px-2 py-1 text-left">Number</th>
              <th className="border border-black px-2 py-1 text-left">Department</th>
              <th className="border border-black px-2 py-1 text-center">Assets</th>
              <th className="border border-black px-2 py-1 text-right">Asset Value</th>
              <th className="border border-black px-2 py-1 text-center">Licenses</th>
              <th className="border border-black px-2 py-1 text-right">License Value</th>
              <th className="border border-black px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((emp) => (
              <tr key={emp.id}>
                <td className="border border-black px-2 py-1">{emp.name}</td>
                <td className="border border-black px-2 py-1">{emp.employeeNumber}</td>
                <td className="border border-black px-2 py-1">{emp.department}</td>
                <td className="border border-black px-2 py-1 text-center">{emp.assetCount}</td>
                <td className="border border-black px-2 py-1 text-right">₱{emp.totalAssetValue.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-center">{emp.licenseCount}</td>
                <td className="border border-black px-2 py-1 text-right">₱{emp.totalLicenseValue.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-right">₱{emp.totalValue.toFixed(2)}</td>
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
              Employee Asset History Report
            </h1>
            <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
              Track asset and license assignments per employee with confirmation status.
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none focus:border-red-600 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <span className="text-[10px] text-slate-500">
            {filteredData.length} of {data.length} employees
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
            <SummaryCard icon={<Users size={18} />} label="Total Employees" value={summary.totalEmployees} color="cyan" />
            <SummaryCard icon={<Package size={18} />} label="Assets Assigned" value={summary.totalAssetsAssigned} color="emerald" />
            <SummaryCard icon={<ShieldCheck size={18} />} label="Licenses Assigned" value={summary.totalLicensesAssigned} color="purple" />
            <SummaryCard icon={<DollarSign size={18} />} label="Total Value" value={formatCurrency(summary.totalValueAssigned)} color="red" />
            <SummaryCard icon={<DollarSign size={18} />} label="Avg per Employee" value={formatCurrency(summary.averageValuePerEmployee)} color="blue" />
            <SummaryCard icon={<AlertCircle size={18} />} label="Pending Confirmations" value={summary.employeesWithPendingConfirmations} color="orange" subtitle="Employees" />
          </div>
        )}

        {/* Employee Table */}
        {!loading && !error && filteredData.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Assets</th>
                  <th className="px-4 py-3 text-center">Licenses</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-center">Confirmations</th>
                  <th className="px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
                {filteredData.map((emp) => (
                  <tr
                    key={emp.id}
                    className={cn(
                      'text-[10px] transition-colors hover:bg-slate-50 dark:hover:bg-white/2',
                      selectedEmployee === emp.id && 'bg-red-500/10 dark:bg-red-500/5',
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[9px] font-mono text-slate-500">{emp.employeeNumber}</div>
                      <div className="text-[9px] text-slate-400">{emp.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Building2 size={12} />
                        <span>{emp.department || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.assetCount}</div>
                      <div className="text-[9px] text-slate-500">{formatCurrency(emp.totalAssetValue)}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="font-bold text-slate-900 dark:text-white">{emp.licenseCount}</div>
                      <div className="text-[9px] text-slate-500">{formatCurrency(emp.totalLicenseValue)}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(emp.totalValue)}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {emp.pendingConfirmations > 0 ? (
                          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-orange-500">
                            {emp.pendingConfirmations} pending
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-500">
                            All confirmed
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[9px] text-slate-500">
                        ✓ {emp.confirmedCount} &nbsp; ✗ {emp.declinedCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setSelectedEmployee(selectedEmployee === emp.id ? null : emp.id)}
                        className="rounded bg-cyan-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-wider text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                      >
                        {selectedEmployee === emp.id ? 'Hide' : 'View'}
                      </button>
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
            <Users size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">No employees found</p>
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

export default EmployeeAssetHistoryReport;
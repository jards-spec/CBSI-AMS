import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  Users,
  Package,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Building2,
  Award,
  Printer,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

type DepartmentData = {
  department: string;
  employeeCount: number;
  employees: { id: string; name: string; employeeNumber: string }[];
  assetCount: number;
  assetValue: number;
  licenseCount: number;
  licenseValue: number;
  totalValue: number;
  perEmployeeValue: number;
  perEmployeeAssets: number;
  perEmployeeLicenses: number;
  assets: any[];
  licenses: any[];
};

type Summary = {
  totalDepartments: number;
  totalEmployees: number;
  totalAssets: number;
  totalAssetValue: number;
  totalLicenseSeats: number;
  totalLicenseValue: number;
  totalValue: number;
  averageValuePerDepartment: number;
  averageValuePerEmployee: number;
  topDepartment: DepartmentData | null;
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

const DepartmentAllocationReport = () => {
  const [data, setData] = useState<DepartmentData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
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
      const result = await api.reports.departmentAllocation();
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
    return [...data];
  }, [data]);

  const buildPrintHtml = (tableHTML: string) => {
    const summaryData = `Generated: ${new Date().toLocaleString()}  â€¢  Total Departments: ${filteredData.length}  â€¢  Total Value: ${formatCurrency(summary?.totalValue || 0)}`;
    
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Department Allocation Report</title>
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
          <h1>Department Allocation Report</h1>
          <div class="meta">${summaryData}</div>
          ${tableHTML}
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (filteredData.length === 0) {
      console.warn('No data to print.');
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
            <th>Department</th>
            <th>Employees</th>
            <th>Assets</th>
            <th>Asset Value</th>
            <th>Licenses</th>
            <th>License Value</th>
            <th>Total Value</th>
            <th>Per Employee</th>
          </tr>
        </thead>
        <tbody>
          ${filteredData.map(item => `
            <tr>
              <td>${item.department}</td>
              <td>${item.employeeCount}</td>
              <td>${item.assetCount}</td>
              <td>â‚±${item.assetValue.toFixed(2)}</td>
              <td>${item.licenseCount}</td>
              <td>â‚±${item.licenseValue.toFixed(2)}</td>
              <td>â‚±${item.totalValue.toFixed(2)}</td>
              <td>â‚±${item.perEmployeeValue.toFixed(2)}</td>
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
          <h1 className="text-xl font-bold">Department Allocation Report</h1>
          <p className="text-xs mt-1">Generated: {new Date().toLocaleString()}</p>
          <p className="text-xs">Total Departments: {filteredData.length}  â€¢  Total Value: {formatCurrency(summary?.totalValue || 0)}</p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-left">Department</th>
              <th className="border border-black px-2 py-1 text-center">Employees</th>
              <th className="border border-black px-2 py-1 text-center">Assets</th>
              <th className="border border-black px-2 py-1 text-right">Asset Value</th>
              <th className="border border-black px-2 py-1 text-center">Licenses</th>
              <th className="border border-black px-2 py-1 text-right">License Value</th>
              <th className="border border-black px-2 py-1 text-right">Total Value</th>
              <th className="border border-black px-2 py-1 text-right">Per Employee</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((dept) => (
              <tr key={dept.department}>
                <td className="border border-black px-2 py-1">{dept.department}</td>
                <td className="border border-black px-2 py-1 text-center">{dept.employeeCount}</td>
                <td className="border border-black px-2 py-1 text-center">{dept.assetCount}</td>
                <td className="border border-black px-2 py-1 text-right">â‚±{dept.assetValue.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-center">{dept.licenseCount}</td>
                <td className="border border-black px-2 py-1 text-right">â‚±{dept.licenseValue.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-right">â‚±{dept.totalValue.toFixed(2)}</td>
                <td className="border border-black px-2 py-1 text-right">â‚±{dept.perEmployeeValue.toFixed(2)}</td>
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
              Department Allocation Report
            </h1>
            <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
              Resource distribution and value allocation by department.
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

        {/* Summary Cards */}
        {!loading && !error && summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
            <SummaryCard
              icon={<Building2 size={18} />}
              label="Departments"
              value={summary.totalDepartments}
              color="cyan"
            />
            <SummaryCard
              icon={<Users size={18} />}
              label="Total Employees"
              value={summary.totalEmployees}
              color="blue"
            />
            <SummaryCard
              icon={<Package size={18} />}
              label="Total Assets"
              value={summary.totalAssets}
              color="emerald"
            />
            <SummaryCard
              icon={<DollarSign size={18} />}
              label="Asset Value"
              value={formatCurrency(summary.totalAssetValue)}
              color="emerald"
            />
            <SummaryCard
              icon={<ShieldCheck size={18} />}
              label="License Seats"
              value={summary.totalLicenseSeats}
              color="purple"
            />
            <SummaryCard
              icon={<DollarSign size={18} />}
              label="License Value"
              value={formatCurrency(summary.totalLicenseValue)}
              color="purple"
            />
            <SummaryCard
              icon={<DollarSign size={18} />}
              label="Total Value"
              value={formatCurrency(summary.totalValue)}
              color="red"
            />
            <SummaryCard
              icon={<Award size={18} />}
              label="Top Department"
              value={summary.topDepartment?.department?.slice(0, 12) || 'N/A'}
              color="orange"
              subtitle={summary.topDepartment ? formatCurrency(summary.topDepartment.totalValue) : ''}
            />
          </div>
        )}

        {/* Department Rankings Table */}
        {!loading && !error && filteredData.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Employees</th>
                  <th className="px-4 py-3 text-center">Assets</th>
                  <th className="px-4 py-3 text-center">Licenses</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-right">Per Employee</th>
                  <th className="px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
                {filteredData.map((dept, index) => (
                  <tr
                    key={dept.department}
                    className={cn(
                      'text-[10px] transition-colors hover:bg-slate-50 dark:hover:bg-white/2',
                      selectedDepartment === dept.department && 'bg-red-500/10 dark:bg-red-500/5',
                      index === 0 && 'bg-yellow-500/5 dark:bg-yellow-500/10',
                      index === 1 && 'bg-slate-500/5 dark:bg-slate-500/10',
                      index === 2 && 'bg-orange-500/5 dark:bg-orange-500/10',
                    )}
                  >
                    <td className="px-4 py-4 text-center">
                      {index === 0 ? (
                        <span className="flex items-center justify-center gap-1 text-[10px] font-black text-yellow-600 dark:text-yellow-500">
                          ðŸ¥‡ 1
                        </span>
                      ) : index === 1 ? (
                        <span className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-600 dark:text-slate-400">
                          ðŸ¥ˆ 2
                        </span>
                      ) : index === 2 ? (
                        <span className="flex items-center justify-center gap-1 text-[10px] font-black text-orange-600 dark:text-orange-500">
                          ðŸ¥‰ 3
                        </span>
                      ) : (
                        <span className="font-mono text-slate-500">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                        {dept.department}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="font-bold text-slate-900 dark:text-white">{dept.employeeCount}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="font-bold text-slate-900 dark:text-white">{dept.assetCount}</div>
                      <div className="text-[9px] text-slate-500">{formatCurrency(dept.assetValue)}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="font-bold text-slate-900 dark:text-white">{dept.licenseCount}</div>
                      <div className="text-[9px] text-slate-500">{formatCurrency(dept.licenseValue)}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(dept.totalValue)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(dept.perEmployeeValue)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setSelectedDepartment(selectedDepartment === dept.department ? null : dept.department)}
                        className="rounded bg-cyan-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-wider text-cyan-500 transition-all hover:bg-cyan-500 hover:text-white"
                      >
                        {selectedDepartment === dept.department ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Building2 size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              No department data found
            </p>
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

export default DepartmentAllocationReport;

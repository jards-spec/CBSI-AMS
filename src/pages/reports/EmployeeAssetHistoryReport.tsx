import React, { useEffect, useState } from 'react';
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

const EmployeeAssetHistoryReport = () => {
  const [data, setData] = useState<EmployeeData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

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

  const exportToCSV = () => {
    const headers = [
      'Employee Name',
      'Employee Number',
      'Email',
      'Department',
      'Assets',
      'Asset Value',
      'Licenses',
      'License Value',
      'Total Value',
      'Pending Confirmations',
    ];

    const rows = data.map((r) => [
      r.name,
      r.employeeNumber,
      r.email,
      r.department,
      r.assetCount,
      r.totalAssetValue.toFixed(2),
      r.licenseCount,
      r.totalLicenseValue.toFixed(2),
      r.totalValue.toFixed(2),
      r.pendingConfirmations,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-asset-history-${new Date().toISOString().split('T')[0]}.csv`;
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

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
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

      {/* Expanded Employee Details */}
      {selectedEmployee && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
          {(() => {
            const emp = data.find((e) => e.id === selectedEmployee);
            if (!emp) return null;

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      {emp.name}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {emp.employeeNumber} • {emp.department} • {emp.role}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-red-600 dark:text-red-500">
                      {formatCurrency(emp.totalValue)}
                    </div>
                    <p className="text-[9px] font-black uppercase text-slate-500">Total Assigned Value</p>
                  </div>
                </div>

                {/* Assets */}
                {emp.assets.length > 0 ? (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      <Package size={14} /> Assigned Assets ({emp.assetCount}) - {formatCurrency(emp.totalAssetValue)}
                    </h4>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-[10px]">
                        <thead className="bg-slate-50 dark:bg-white/5">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">Tag</th>
                            <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">Name</th>
                            <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">Category</th>
                            <th className="px-3 py-2 text-center font-bold text-slate-600 dark:text-slate-400">Status</th>
                            <th className="px-3 py-2 text-right font-bold text-slate-600 dark:text-slate-400">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {emp.assets.map((asset) => (
                            <tr key={asset.id}>
                              <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{asset.tag}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{asset.name}</td>
                              <td className="px-3 py-2 text-slate-500">{asset.category}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase dark:bg-white/10">
                                  {asset.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                {formatCurrency(asset.unitCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-white/5">
                    <p className="text-[10px] font-black uppercase text-slate-500">No assets assigned</p>
                  </div>
                )}

                {/* Licenses */}
                {emp.licenses.length > 0 ? (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      <ShieldCheck size={14} /> Assigned Licenses ({emp.licenseCount}) - {formatCurrency(emp.totalLicenseValue)}
                    </h4>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-[10px]">
                        <thead className="bg-slate-50 dark:bg-white/5">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">License</th>
                            <th className="px-3 py-2 text-center font-bold text-slate-600 dark:text-slate-400">Seats</th>
                            <th className="px-3 py-2 text-center font-bold text-slate-600 dark:text-slate-400">Status</th>
                            <th className="px-3 py-2 text-right font-bold text-slate-600 dark:text-slate-400">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {emp.licenses.map((lic) => (
                            <tr key={lic.id}>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{lic.licenseName}</td>
                              <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">{lic.quantity}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-500">
                                  {lic.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                {formatCurrency(lic.unitCost * lic.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-white/5">
                    <p className="text-[10px] font-black uppercase text-slate-500">No licenses assigned</p>
                  </div>
                )}
              </div>
            );
          })()}
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
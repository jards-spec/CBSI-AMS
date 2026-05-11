import React, { useEffect, useState } from 'react';
import {
  Download,
  Users,
  Package,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Building2,
  Award,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

type DepartmentData = {
  department: string;
  employeeCount: number;
  employees: { id: string; name: string; employeeNumber: string }[];
  assetCount: number;
  assetValue: number;
  licenseSeats: number;
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

const DepartmentAllocationReport = () => {
  const [data, setData] = useState<DepartmentData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

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

  const exportToCSV = () => {
    const headers = [
      'Department',
      'Employees',
      'Assets',
      'Asset Value',
      'License Seats',
      'License Value',
      'Total Value',
      'Per Employee Value',
      'Per Employee Assets',
      'Per Employee Licenses',
    ];

    const rows = data.map((r) => [
      r.department,
      r.employeeCount,
      r.assetCount,
      r.assetValue.toFixed(2),
      r.licenseSeats,
      r.licenseValue.toFixed(2),
      r.totalValue.toFixed(2),
      r.perEmployeeValue.toFixed(2),
      r.perEmployeeAssets.toFixed(2),
      r.perEmployeeLicenses.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-allocation-${new Date().toISOString().split('T')[0]}.csv`;
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
            Department Allocation Report
          </h1>
          <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
            Resource distribution and value allocation by department.
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

      {/* Summary Cards */}
      {!loading && !error && summary && (
        <div className="space-y-6">
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

          {/* Department Rankings Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-100 px-6 py-4 dark:border-slate-800 dark:bg-[#161b22]">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Department Rankings
              </h2>
              <p className="text-[10px] text-slate-500">Sorted by total resource value</p>
            </div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#0f121d] dark:text-slate-500">
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
                {data.map((dept, index) => (
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
                          🥇 1
                        </span>
                      ) : index === 1 ? (
                        <span className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-600 dark:text-slate-400">
                          🥈 2
                        </span>
                      ) : index === 2 ? (
                        <span className="flex items-center justify-center gap-1 text-[10px] font-black text-orange-600 dark:text-orange-500">
                          🥉 3
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
                      <div className="font-bold text-slate-900 dark:text-white">{dept.licenseSeats}</div>
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
                      <div className="text-[9px] text-slate-500">
                        {dept.perEmployeeAssets.toFixed(1)} assets, {dept.perEmployeeLicenses.toFixed(1)} licenses
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

          {/* Expanded Department Details */}
          {selectedDepartment && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              {(() => {
                const dept = data.find((d) => d.department === selectedDepartment);
                if (!dept) return null;

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          {dept.department}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          {dept.employeeCount} employees • {dept.assetCount} assets • {dept.licenseSeats} license seats
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-red-600 dark:text-red-500">
                          {formatCurrency(dept.totalValue)}
                        </div>
                        <p className="text-[9px] font-black uppercase text-slate-500">Total Value</p>
                      </div>
                    </div>

                    {/* Employees */}
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        <Users size={14} /> Employees ({dept.employeeCount})
                      </h4>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {dept.employees.map((emp) => (
                          <div
                            key={emp.id}
                            className="rounded-lg bg-slate-50 p-3 dark:bg-white/5"
                          >
                            <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                            <div className="text-[9px] font-mono text-slate-500">{emp.employeeNumber}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assets */}
                    {dept.assets.length > 0 && (
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          <Package size={14} /> Assets ({dept.assetCount}) - {formatCurrency(dept.assetValue)}
                        </h4>
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-[10px]">
                            <thead className="bg-slate-50 dark:bg-white/5">
                              <tr>
                                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">Tag</th>
                                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">Name</th>
                                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">Category</th>
                                <th className="px-3 py-2 text-right font-bold text-slate-600 dark:text-slate-400">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {dept.assets.slice(0, 10).map((asset) => (
                                <tr key={asset.id}>
                                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{asset.tag}</td>
                                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{asset.name}</td>
                                  <td className="px-3 py-2 text-slate-500">{asset.category}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                    {formatCurrency(asset.unitCost)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {dept.assets.length > 10 && (
                          <p className="mt-2 text-[9px] text-slate-500">
                            Showing 10 of {dept.assets.length} assets
                          </p>
                        )}
                      </div>
                    )}

                    {/* Licenses */}
                    {dept.licenses.length > 0 && (
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          <ShieldCheck size={14} /> Licenses ({dept.licenseSeats} seats) - {formatCurrency(dept.licenseValue)}
                        </h4>
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-[10px]">
                            <thead className="bg-slate-50 dark:bg-white/5">
                              <tr>
                                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400">License</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-600 dark:text-slate-400">Seats</th>
                                <th className="px-3 py-2 text-right font-bold text-slate-600 dark:text-slate-400">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {dept.licenses.slice(0, 10).map((lic, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{lic.licenseName}</td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">{lic.quantity}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                    {formatCurrency(lic.unitCost)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {dept.licenses.length > 10 && (
                          <p className="mt-2 text-[9px] text-slate-500">
                            Showing 10 of {dept.licenses.length} licenses
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
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
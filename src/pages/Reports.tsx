import React, { useState } from 'react';
import { cn } from '../lib/utils';
import LicenseComplianceReport from './reports/LicenseComplianceReport';
import AssetValuationReport from './reports/AssetValuationReport';
import DepartmentAllocationReport from './reports/DepartmentAllocationReport';
import MaintenanceCostReport from './reports/MaintenanceCostReport';
import EmployeeAssetHistoryReport from './reports/EmployeeAssetHistoryReport';
import UnconfirmedAssignmentsReport from './reports/UnconfirmedAssignmentsReport';
import { ShieldCheck, Package, Users, Wrench, UserCheck, Bell, Printer } from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState<'license' | 'asset' | 'department' | 'maintenance' | 'employee' | 'unconfirmed'>('license');

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { id: 'license', label: 'License Compliance', icon: ShieldCheck },
    { id: 'asset', label: 'Asset Valuation', icon: Package },
    { id: 'department', label: 'Department Allocation', icon: Users },
    { id: 'maintenance', label: 'Maintenance Cost', icon: Wrench },
    { id: 'employee', label: 'Employee History', icon: UserCheck },
    { id: 'unconfirmed', label: 'Unconfirmed', icon: Bell },
  ] as const;

  return (
    <div className="min-h-screen">
      {/* Print Header (Only visible when printing) */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1>CentralBooks Vantage - Asset Management Report</h1>
        <p>Generated: {new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>

      {/* Screen Header */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 no-print">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Reports
            </h1>
            <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
              Comprehensive analytics and insights for asset management.
            </p>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="print-button no-print"
          >
            <Printer size={14} />
            Print Report
          </button>
        </div>

        {/* Report Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 no-print">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
              )}
            >
              <tab.icon size={14} strokeWidth={3} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div className="animate-in fade-in duration-500">
        {activeTab === 'license' && <LicenseComplianceReport />}
        {activeTab === 'asset' && <AssetValuationReport />}
        {activeTab === 'department' && <DepartmentAllocationReport />}
        {activeTab === 'maintenance' && <MaintenanceCostReport />}
        {activeTab === 'employee' && <EmployeeAssetHistoryReport />}
        {activeTab === 'unconfirmed' && <UnconfirmedAssignmentsReport />}
      </div>

      {/* Print Footer (Only visible when printing) */}
      <div className="print-footer" style={{ display: 'none' }}>
        <p>CentralBooks Vantage Asset Management System | Generated: {new Date().toLocaleString()}</p>
        <p>Page <span className="page-number"></span> of <span className="total-pages"></span></p>
      </div>
    </div>
  );
};

export default Reports;

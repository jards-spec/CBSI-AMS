import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  Activity,
  ArrowUpRight,
  Clock,
  LayoutDashboard,
  MousePointer2,
  Plus,
  Search,
  X,
  ShieldAlert,
  PieChart,
  ShieldCheck,
  MousePointer,
} from 'lucide-react';
import { useAudit } from '../hooks/useAudit';
import { cn } from '../lib/utils';
import ConsumableModal from '../components/ConsumableModal';
import { api } from '../lib/api';

const Dashboard = () => {
  const { logs } = useAudit();
  const navigate = useNavigate();
  const [isConsumableModalOpen, setIsConsumableModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);

  const loadDashboardData = async () => {
    const [assetRows, employeeRows, requestRows, licenseRows, accessoryRows, consumableRows] = await Promise.all([
      api.assets.list(),
      api.employees.list(),
      api.requests.list(),
      api.licenses.list(),
      api.accessories.list(),
      api.consumables.list(),
    ]);

    setAssets(assetRows);
    setPersonnel(employeeRows);
    setRequests(requestRows);
    setLicenses(licenseRows);
    setAccessories(accessoryRows);
    setConsumables(consumableRows);
  };

  useEffect(() => {
    loadDashboardData().catch((error) => console.error('Failed to load dashboard data:', error));
  }, []);

  const { stats, searchResults, maintenanceAlerts, categoryData, lowStockCount } = useMemo(() => {
    const lowStockItems = [
      ...consumables.filter((item) => Number(item.remaining) <= Number(item.minQty)),
      ...accessories.filter((item) => Number(item.total || 0) - Number(item.checkedOut || 0) <= Number(item.minQty || 0)),
      ...licenses.filter((item) => Number(item.avail || 0) <= Number(item.minQty || 0)),
    ];

    const pendingReqCount = requests.filter((request) => request.status === 'Pending').length;

    const inventoryValue = consumables.reduce(
      (sum, item) => sum + Number(item.remaining || 0) * Number(item.unitCost || 0),
      0,
    );

    const categories: Record<string, number> = {};
    assets.forEach((asset) => {
      const category = asset.category || 'Hardware';
      categories[category] = (categories[category] || 0) + 1;
    });

    const catArray = Object.entries(categories)
      .map(([name, count]) => ({
        name,
        count,
        percentage: assets.length > 0 ? Math.round((count / assets.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    let results: any[] = [];
    if (searchQuery.trim().length > 1) {
      const query = searchQuery.toLowerCase();
      const assetMatches = assets
        .filter((asset) => asset.tag?.toLowerCase().includes(query) || asset.name?.toLowerCase().includes(query))
        .map((asset) => ({ ...asset, type: 'ASSET', link: '/assets' }));
      const personMatches = personnel
        .filter((person) => person.name?.toLowerCase().includes(query))
        .map((person) => ({ ...person, type: 'PERSONNEL', link: '/employees' }));
      const licenseMatches = licenses
        .filter((license) => license.name?.toLowerCase().includes(query))
        .map((license) => ({ ...license, type: 'LICENSE', link: '/licenses' }));

      results = [...assetMatches, ...personMatches, ...licenseMatches].slice(0, 5);
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const alerts = licenses
      .filter((license) => {
        if (!license.expirationDate) return false;
        const expiry = new Date(license.expirationDate);
        return !Number.isNaN(expiry.getTime()) && expiry <= thirtyDaysFromNow;
      })
      .map((license) => ({
        tag: license.manufacturer || 'LICENSE',
        name: license.name,
        expiry: license.expirationDate,
        isExpired: new Date(license.expirationDate) < today,
      }))
      .slice(0, 3);

    return {
      stats: {
        totalAssets: assets.length,
        totalPersonnel: personnel.length,
        totalLicenses: licenses.length,
        totalAccessories: accessories.length,
        pendingRequests: pendingReqCount,
        valuation: inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        recentLogs: logs.slice(0, 6),
      },
      lowStockCount: lowStockItems.length,
      searchResults: results,
      maintenanceAlerts: alerts,
      categoryData: catArray,
    };
  }, [accessories, assets, consumables, licenses, logs, personnel, requests, searchQuery]);

  const handleQuickAddConsumable = async (formData: any) => {
    try {
      await api.consumables.create(formData);
      await loadDashboardData();
      setIsConsumableModalOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 bg-transparent text-slate-900 dark:text-white">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          <div className="group relative">
            <div className="absolute -inset-1 rounded-2xl bg-red-600 blur opacity-25 transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] p-4">
              <LayoutDashboard className="text-red-600" size={32} />
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white italic">
              Command <span className="text-red-600">Center</span>
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic leading-none">
                Vantage v3.2 // System Status: Nominal
              </p>
              {lowStockCount > 0 ? (
                <div className="flex items-center gap-2 rounded-full border border-red-600/20 bg-red-600/10 px-2 py-0.5 animate-pulse">
                  <div className="h-1 w-1 rounded-full bg-red-600" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-500">{lowStockCount} Alert</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="group relative w-full lg:w-112.5">
          <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
            <Search size={18} className={cn('transition-colors', searchQuery ? 'text-red-500' : 'text-slate-400 dark:text-slate-600')} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ACCESS GLOBAL REGISTRY..."
            className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#05070a] py-5 pl-14 pr-12 text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none transition-all shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] focus:border-red-600"
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X size={18} />
            </button>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-100 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id ?? index}`}
                  onClick={() => {
                    navigate(result.link);
                    setSearchQuery('');
                  }}
                  className="group/item flex w-full items-center justify-between border-b border-slate-100 dark:border-slate-800/50 p-5 transition-all last:border-0 hover:bg-red-600/5"
                >
                  <div className="text-left">
                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white italic transition-colors group-hover/item:text-red-500">
                      {result.name || result.tag}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-600">{result.type}</p>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-400 dark:text-slate-800 transition-all group-hover/item:text-red-600" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Inventory" value={stats.totalAssets} subValue="Physical Assets" icon={<Package size={22} />} />
        <StatCard title="Entitlements" value={stats.totalLicenses} subValue="Managed Licenses" icon={<ShieldCheck size={22} />} />
        <StatCard title="Operatives" value={stats.totalPersonnel} subValue="Active Personnel" icon={<Users size={22} />} />
        <StatCard title="Peripherals" value={stats.totalAccessories} subValue="Accessory Stock" icon={<MousePointer size={22} />} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] p-10 shadow-2xl">
            <div className="mb-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg border border-red-600/20 bg-red-600/10 p-2">
                  <PieChart className="text-red-600" size={20} />
                </div>
                <h2 className="text-md font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white italic">Hardware Distribution</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
              <div className="space-y-8">
                {categoryData.length > 0 ? (
                  categoryData.map((category, index) => (
                    <div key={`${category.name}-${index}`} className="group/bar space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="text-slate-500 italic transition-colors group-hover/bar:text-slate-700 dark:group-hover/bar:text-slate-300">{category.name}</span>
                        <span className="rounded border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 text-slate-900 dark:text-white">{category.percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full border border-slate-200 dark:border-slate-900 bg-slate-100 dark:bg-slate-950 shadow-inner">
                        <div className="relative h-full rounded-full bg-gradient-to-r from-red-900 to-red-600 transition-all duration-1000" style={{ width: `${category.percentage}%` }}>
                          <div className="absolute inset-0 animate-pulse bg-white/10" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="animate-pulse text-[10px] font-black uppercase text-slate-400 dark:text-slate-700 italic">Syncing distribution data...</p>
                )}
              </div>

              <div className="group/total relative flex flex-col items-center justify-center rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#05070a] p-12 text-center shadow-inner">
                <div className="absolute right-4 top-4 opacity-5 transition-opacity group-hover/total:opacity-10">
                  <Activity size={80} className="text-red-600" />
                </div>
                <div className="relative z-10 mb-2 text-6xl font-black tracking-tighter text-slate-900 dark:text-white italic transition-transform duration-500 group-hover/total:scale-110">
                  {categoryData[0]?.percentage || 0}
                  <span className="text-red-600">%</span>
                </div>
                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.4em] text-red-600 italic">Primary Sector</div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {categoryData[0]?.name || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-[#161b29]/30 p-8">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-600/10 p-2">
                  <Clock className="text-red-600" size={20} />
                </div>
                <h2 className="text-md font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white italic">Real-Time Ledger</h2>
              </div>
              <Link to="/audit-history" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-2.5 px-5 text-[9px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-red-600 dark:hover:border-red-600 hover:text-slate-900 dark:hover:text-white italic">
                Full Trail
              </Link>
            </div>
            <div className="space-y-3 p-6">
              {stats.recentLogs.map((log: any) => (
                <div key={log.id} className="group/log flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-[#05070a] p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-center gap-5">
                    <div
                      className={cn(
                        'w-24 rounded-lg border px-3 py-2 text-center text-[8px] font-black uppercase tracking-[0.2em] italic',
                        log.type === 'ADDED' ? 'border-emerald-600/20 bg-emerald-600/10 text-emerald-500' : 'border-red-600/20 bg-red-600/10 text-red-500',
                      )}
                    >
                      {log.type}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-100 transition-colors group-hover/log:text-red-500">{log.entity}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-600 italic">{log.message}</p>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-tighter text-slate-400 dark:text-slate-700">{log.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] p-8 shadow-xl">
            <div className="mb-8 flex items-center gap-4">
              <ShieldAlert className="text-red-600" size={20} />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white italic">Lifecycle Alerts</h3>
            </div>
            {maintenanceAlerts.length > 0 ? (
              <div className="space-y-4">
                {maintenanceAlerts.map((alert, index) => (
                  <div key={`${alert.name}-${index}`} className="group/alert flex flex-col gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#05070a] p-5 transition-all hover:border-red-300 dark:hover:border-red-600/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900 dark:text-white transition-colors group-hover/alert:text-red-500">
                        {alert.tag}
                      </span>
                      <span className={cn('rounded-lg px-3 py-1 text-[8px] font-black uppercase tracking-widest', alert.isExpired ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'border border-red-600/20 bg-red-600/10 text-red-500')}>
                        {alert.isExpired ? 'Expired' : 'Critical'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">{alert.name}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-700">{alert.expiry}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center opacity-40 dark:opacity-20">
                <ShieldCheck size={48} className="mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500 italic">All Status: Protected</p>
              </div>
            )}
          </div>

          <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-red-700 to-[#5a0000] p-10 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <MousePointer2 className="absolute -bottom-8 -right-8 text-white/5 transition-transform duration-1000 group-hover:-rotate-12 group-hover:scale-110" size={180} />

            <div className="relative z-10">
              <h3 className="mb-4 text-3xl font-black uppercase tracking-tighter italic leading-[0.85]">
                Resource
                <br />
                <span className="text-red-400">Registry</span>
              </h3>
              <p className="mb-8 text-[9px] font-black uppercase tracking-[0.2em] text-white/60 italic">Quick-add protocol for consumable assets.</p>
              <button
                onClick={() => setIsConsumableModalOpen(true)}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-5 text-[11px] font-black uppercase tracking-widest text-black shadow-2xl transition-all active:scale-95 hover:bg-red-500 hover:text-white"
              >
                <Plus size={18} strokeWidth={4} /> Initialize
              </button>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] p-8 shadow-xl">
            <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-700 italic">Quick Access Nodes</h3>
            <div className="grid grid-cols-2 gap-4">
              <ShortcutButton label="Licenses" to="/licenses" icon={<ShieldCheck size={14} />} />
              <ShortcutButton label="Accessories" to="/accessories" icon={<MousePointer size={14} />} />
              <ShortcutButton label="Assets" to="/assets" icon={<Package size={14} />} />
              <ShortcutButton label="Personnel" to="/employees" icon={<Users size={14} />} />
            </div>
          </div>
        </div>
      </div>

      {isConsumableModalOpen ? (
        <ConsumableModal onClose={() => setIsConsumableModalOpen(false)} onSave={handleQuickAddConsumable} />
      ) : null}
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon }: any) => (
  <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f121d] p-8 shadow-2xl transition-all hover:border-red-300 dark:hover:border-red-600/50">
    <div className="absolute -mr-8 -mt-8 right-0 top-0 h-24 w-24 rounded-bl-[4rem] bg-red-600/5 transition-colors group-hover:bg-red-600/10" />

    <div className="relative z-10 mb-10 flex items-start justify-between">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#05070a] p-4 text-red-600 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
        {icon}
      </div>
      <ArrowUpRight className="text-slate-400 dark:text-slate-800 transition-colors group-hover:text-red-600" size={20} />
    </div>

    <div className="relative z-10">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">{title}</p>
      <h3 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white italic transition-transform group-hover:translate-x-1">{value}</h3>
      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-700 transition-colors group-hover:text-red-600 dark:group-hover:text-red-900 italic">{subValue}</p>
    </div>
  </div>
);

const ShortcutButton = ({ label, to, icon }: { label: string; to: string; icon: React.ReactNode }) => (
  <Link
    to={to}
    className="group flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#05070a] p-6 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-600 transition-all hover:-translate-y-1 hover:border-red-600 dark:hover:border-red-600 hover:bg-red-600 hover:text-white italic"
  >
    <div className="transition-transform group-hover:scale-125">{icon}</div>
    {label}
  </Link>
);

export default Dashboard;
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, Users, Activity, AlertTriangle, ArrowUpRight, 
  Clock, LayoutDashboard, MousePointer2, Plus, Search, X, 
  ShieldAlert, PieChart, Bell, ShieldCheck, HardDrive, MousePointer
} from 'lucide-react';
import { useAudit } from '../hooks/useAudit';
import { cn } from '../lib/utils';
import ConsumableModal from '../components/ConsumableModal';

const Dashboard = () => {
  const { logs, addLog } = useAudit();
  const navigate = useNavigate();
  const [isConsumableModalOpen, setIsConsumableModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. DATA AGGREGATION - KEPT AS PER ORIGINAL LOGIC
  const { stats, searchResults, maintenanceAlerts, categoryData, lowStockCount } = useMemo(() => {
    const consumables = JSON.parse(localStorage.getItem('ams_consumables') || '[]');
    const personnel = JSON.parse(localStorage.getItem('ams_employees') || '[]');
    const assets = JSON.parse(localStorage.getItem('ams_assets') || '[]');
    const requests = JSON.parse(localStorage.getItem('ams_requests') || '[]');
    const licenses = JSON.parse(localStorage.getItem('ams_licenses') || '[]');
    const accessories = JSON.parse(localStorage.getItem('ams_accessories') || '[]');

    const lowStockItems = [
      ...consumables.filter((c: any) => Number(c.remaining) <= Number(c.minQty)),
      ...accessories.filter((a: any) => Number(a.qty) <= Number(a.minQty))
    ];

    const pendingReqCount = requests.filter((r: any) => r.status === 'Pending').length;
    
    const inventoryValue = consumables.reduce((sum: number, c: any) => 
      sum + (Number(c.remaining) * (Number(c.unitCost) || 0)), 0
    );

    const categories: Record<string, number> = {};
    assets.forEach((a: any) => {
      const cat = a.category || 'Hardware';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const catArray = Object.entries(categories)
      .map(([name, count]) => ({
        name,
        count,
        percentage: assets.length > 0 ? Math.round((count / assets.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    let results: any[] = [];
    if (searchQuery.trim().length > 1) {
      const q = searchQuery.toLowerCase();
      const assetMatches = assets.filter((a: any) => a.tag?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q))
        .map((a: any) => ({ ...a, type: 'ASSET', link: '/inventory' }));
      const personMatches = personnel.filter((p: any) => p.name?.toLowerCase().includes(q))
        .map((p: any) => ({ ...p, type: 'PERSONNEL', link: '/personnel' }));
      const licMatches = licenses.filter((l: any) => l.name?.toLowerCase().includes(q))
        .map((l: any) => ({ ...l, type: 'LICENSE', link: '/licenses' }));
      
      results = [...assetMatches, ...personMatches, ...licMatches].slice(0, 5);
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const alerts = assets.filter((a: any) => {
      if (!a.warranty) return false;
      const expiry = new Date(a.warranty);
      return expiry <= thirtyDaysFromNow;
    }).map((a: any) => ({
      tag: a.tag,
      name: a.name,
      expiry: a.warranty,
      isExpired: new Date(a.warranty) < today
    })).slice(0, 3);

    return {
      stats: {
        totalAssets: assets.length,
        totalPersonnel: personnel.length,
        totalLicenses: licenses.length,
        totalAccessories: accessories.length,
        pendingRequests: pendingReqCount,
        valuation: inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        recentLogs: logs.slice(0, 6)
      },
      lowStockCount: lowStockItems.length,
      searchResults: results,
      maintenanceAlerts: alerts,
      categoryData: catArray
    };
  }, [logs, searchQuery]);

  const handleQuickAddConsumable = (formData: any) => {
    const existing = JSON.parse(localStorage.getItem('ams_consumables') || '[]');
    const newItem = { ...formData, id: Date.now() };
    localStorage.setItem('ams_consumables', JSON.stringify([newItem, ...existing]));
    addLog('ADDED', formData.name, `Quick-added via Dashboard`);
    setIsConsumableModalOpen(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER & SEARCH HUD */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-red-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative p-4 bg-[#0f121d] border border-slate-800 rounded-2xl">
              <LayoutDashboard className="text-red-600" size={32} />
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">
              Command <span className="text-red-600">Center</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] italic leading-none">
                 AssetFlow v3.2 // System Status: Nominal
               </p>
               {lowStockCount > 0 && (
                <div className="flex bg-red-600/10 border border-red-600/20 px-2 py-0.5 rounded-full items-center gap-2 animate-pulse">
                  <div className="w-1 h-1 bg-red-600 rounded-full" />
                  <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">{lowStockCount} ALERT</span>
                </div>
               )}
            </div>
          </div>
        </div>

        <div className="relative w-full lg:w-[450px] group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search size={18} className={cn("transition-colors", searchQuery ? "text-red-500" : "text-slate-600")} />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ACCESS GLOBAL REGISTRY..."
            className="w-full bg-[#05070a] border border-slate-800 rounded-3xl py-5 pl-14 pr-12 text-[11px] font-black text-white placeholder:text-slate-700 uppercase tracking-[0.2em] focus:outline-none focus:border-red-600 transition-all shadow-[0_0_40px_rgba(0,0,0,0.3)]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-5 flex items-center text-slate-500 hover:text-white">
              <X size={18} />
            </button>
          )}

          {searchResults.length > 0 && (
            <div className="absolute top-[calc(100%+10px)] left-0 right-0 bg-[#0f121d] border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden backdrop-blur-xl">
              {searchResults.map((result: any, i) => (
                <button 
                  key={i}
                  onClick={() => { navigate(result.link); setSearchQuery(''); }}
                  className="w-full p-5 flex items-center justify-between hover:bg-red-600/5 transition-all border-b border-slate-800/50 last:border-0 group/item"
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-white uppercase italic group-hover/item:text-red-500 transition-colors">{result.name || result.tag}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-0.5">{result.type}</p>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-800 group-hover/item:text-red-600 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CORE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Inventory" value={stats.totalAssets} subValue="Physical Assets" icon={<Package size={22} />} color="red" />
        <StatCard title="Entitlements" value={stats.totalLicenses} subValue="Managed Licenses" icon={<ShieldCheck size={22} />} color="red" />
        <StatCard title="Operatives" value={stats.totalPersonnel} subValue="Active Personnel" icon={<Users size={22} />} color="red" />
        <StatCard title="Peripherals" value={stats.totalAccessories} subValue="Accessory Stock" icon={<MousePointer size={22} />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* DISTRIBUTION VISUALIZER */}
          <div className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-600/10 rounded-lg border border-red-600/20">
                  <PieChart className="text-red-600" size={20} />
                </div>
                <h2 className="text-md font-black text-white uppercase tracking-[0.3em] italic">Hardware Distribution</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                {categoryData.length > 0 ? categoryData.map((cat, i) => (
                  <div key={i} className="space-y-3 group/bar">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                      <span className="text-slate-500 italic group-hover/bar:text-slate-300 transition-colors">{cat.name}</span>
                      <span className="text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{cat.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-red-900 to-red-600 rounded-full transition-all duration-1000 relative" 
                        style={{ width: `${cat.percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-white/10 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-[10px] text-slate-700 uppercase italic font-black animate-pulse">Syncing distribution data...</p>
                )}
              </div>
              
              <div className="bg-[#05070a] border border-slate-800 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center shadow-inner relative group/total">
                  <div className="absolute top-4 right-4 opacity-5 group-hover/total:opacity-10 transition-opacity">
                    <Activity size={80} className="text-red-600" />
                  </div>
                  <div className="text-6xl font-black text-white italic tracking-tighter mb-2 relative z-10 group-hover/total:scale-110 transition-transform duration-500">
                    {categoryData[0]?.percentage || 0}<span className="text-red-600">%</span>
                  </div>
                  <div className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] italic mb-3">Primary Sector</div>
                  <div className="text-[12px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                    {categoryData[0]?.name || 'N/A'}
                  </div>
              </div>
            </div>
          </div>

          {/* ACTIVITY FEED */}
          <div className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-[#161b29]/30">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-600/10 rounded-lg">
                  <Clock className="text-red-600" size={20} />
                </div>
                <h2 className="text-md font-black text-white uppercase tracking-[0.3em] italic">Real-Time Ledger</h2>
              </div>
              <Link to="/audit-logs" className="p-2.5 px-5 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black text-slate-500 hover:text-white hover:border-red-600 transition-all uppercase tracking-widest italic">
                Full Trail
              </Link>
            </div>
            <div className="p-6 space-y-3">
              {stats.recentLogs.map((log: any) => (
                <div key={log.id} className="p-5 flex items-center justify-between bg-[#05070a] border border-slate-800/50 rounded-2xl hover:border-slate-700 transition-colors group/log">
                  <div className="flex items-center gap-5">
                    <div className={cn("text-[8px] font-black px-3 py-2 rounded-lg w-24 text-center border uppercase tracking-[0.2em] italic", 
                      log.type === 'ADDED' ? 'bg-emerald-600/10 text-emerald-500 border-emerald-600/20' : 'bg-red-600/10 text-red-500 border-red-600/20'
                    )}>
                      {log.type}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-100 uppercase tracking-tight group-hover/log:text-red-500 transition-colors">{log.entity}</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase italic tracking-tighter mt-0.5">{log.message}</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono font-black text-slate-700 tracking-tighter uppercase">{log.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-8">
          {/* WARRANTY WATCH */}
          <div className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <ShieldAlert className="text-red-600" size={20} />
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">Lifecycle Alerts</h3>
            </div>
            {maintenanceAlerts.length > 0 ? (
              <div className="space-y-4">
                {maintenanceAlerts.map((alert: any, i: number) => (
                  <div key={i} className="p-5 bg-[#05070a] border border-slate-800 rounded-2xl flex flex-col gap-2 hover:border-red-600/40 transition-all group/alert">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-tighter group-hover/alert:text-red-500 transition-colors">{alert.tag}</span>
                      <span className={cn("text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-widest", alert.isExpired ? "bg-red-600 text-white shadow-lg shadow-red-900/40" : "bg-red-600/10 text-red-500 border border-red-600/20")}>
                        {alert.isExpired ? "EXPIRED" : "CRITICAL"}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest leading-tight">{alert.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 opacity-20">
                <ShieldCheck size={48} className="mx-auto text-slate-500 mb-4" />
                <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-[0.4em]">All Status: Protected</p>
              </div>
            )}
          </div>

          {/* QUICK PROVISIONING */}
          <div className="bg-gradient-to-br from-red-700 to-[#5a0000] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <MousePointer2 className="absolute -right-8 -bottom-8 text-white/5 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000" size={180} />
            
            <div className="relative z-10">
                <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 italic leading-[0.85]">
                  Resource<br/><span className="text-red-400">Registry</span>
                </h3>
                <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] mb-8 italic">Quick-Add protocol for<br/>Consumable assets.</p>
                <button 
                  onClick={() => setIsConsumableModalOpen(true)} 
                  className="w-full bg-white text-black font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white shadow-2xl active:scale-95"
                >
                  <Plus size={18} strokeWidth={4} /> Initialize
                </button>
            </div>
          </div>

          {/* TERMINAL LINKS */}
          <div className="bg-[#0f121d] border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] mb-8 italic">Quick Access Nodes</h3>
            <div className="grid grid-cols-2 gap-4">
              <ShortcutButton label="Licenses" to="/licenses" icon={<ShieldCheck size={14}/>} />
              <ShortcutButton label="Accessories" to="/accessories" icon={<MousePointer size={14}/>} />
              <ShortcutButton label="Inventory" to="/inventory" icon={<Package size={14}/>} />
              <ShortcutButton label="Personnel" to="/personnel" icon={<Users size={14}/>} />
            </div>
          </div>
        </div>
      </div>

      {isConsumableModalOpen && <ConsumableModal onClose={() => setIsConsumableModalOpen(false)} onSave={handleQuickAddConsumable} />}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StatCard = ({ title, value, subValue, icon, color }: any) => {
  return (
    <div className="p-8 rounded-[2.5rem] border border-slate-800 bg-[#0f121d] relative transition-all hover:border-red-600/50 shadow-2xl group overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-red-600/10 transition-colors" />
      
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className="p-4 rounded-2xl bg-[#05070a] border border-slate-800 text-red-600 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500">
          {icon}
        </div>
        <ArrowUpRight className="text-slate-800 group-hover:text-red-600 transition-colors" size={20} />
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1 italic">{title}</p>
        <h3 className="text-5xl font-black text-white italic tracking-tighter group-hover:translate-x-1 transition-transform">{value}</h3>
        <p className="text-[9px] font-black mt-3 uppercase text-slate-700 italic tracking-[0.2em] group-hover:text-red-900 transition-colors">
          {subValue}
        </p>
      </div>
    </div>
  );
};

const ShortcutButton = ({ label, to, icon }: { label: string, to: string, icon: React.ReactNode }) => (
  <Link to={to} className="flex flex-col items-center justify-center p-6 bg-[#05070a] border border-slate-800 rounded-[2rem] text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white hover:border-red-600 hover:-translate-y-1 transition-all text-center gap-3 italic group">
    <div className="group-hover:scale-125 transition-transform">{icon}</div>
    {label}
  </Link>
);

export default Dashboard;
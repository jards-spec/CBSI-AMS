import React, { useEffect, useMemo, useState } from 'react';
import {
  Send,
  Search,
  Calendar,
  Filter,
  User,
  Building2,
  Layers,
  CheckCircle,
  XCircle,
  Printer,
  ListFilter,
  FilePlus,
  UserCheck,
  ChevronDown,
  Plus,
  Cpu,
  MemoryStick,
  Trash2,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import PrintableRequest from '../components/PrintableRequest';
import { useConfirm } from '../context/ConfirmContext';

const DEPT_MANAGER_MAP: Record<string, string> = {
  'Editorial Department': 'Bryan Defita',
  'Creatives Department': 'Cathy Perez',
  'Picturebooks Department': 'Nitz Vilante',
  'Yearbooks Department': 'Ronnie Fallado',
  'Production Department': 'Jigz Puraz',
  'Accounting Department': 'Julie Ann Villanueva',
  'MIS Department': 'Walter Del Rosario',
  'E-Commerce Department': 'Lorenz Bio',
  'Warehouse Department': 'Ricky Bernardo',
  'Human Resources': 'Ruth Octaviano',
  Admin: 'Wilbert Limen',
  'Maintenance Department': 'Wilbert Limen',
  'POD Department': 'Jigz Puraz',
  'Legal Materials': 'Girlie Jacala (AVP)',
};

const EXECUTIVES = [
  { name: 'Mr. Paolo M. Sibal', title: 'President' },
  { name: 'Mr. Carlos M. Sibal', title: 'VP of Operations' },
  { name: 'Mr. Robby M. Sibal', title: 'VP of Marketing' },
];

const DEVICE_TYPES = ['Desktop', 'Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam'];

const PROCESSOR_OPTIONS = [
  'Intel Core i3',
  'Intel Core i5',
  'Intel Core i7',
  'Intel Core i9',
  'AMD Ryzen 3',
  'AMD Ryzen 5',
  'AMD Ryzen 7',
  'AMD Ryzen 9',
  'Apple M1',
  'Apple M2',
  'Apple M3',
];

const RAM_OPTIONS = ['4GB', '8GB', '16GB', '32GB', '64GB'];

type Scope = 'active' | 'archived' | 'all';

type RequestItem = {
  id: number;
  type: string;
  customType: string;
  processor: string;
  ram: string;
  quantity: number;
};

const createDefaultItem = (): RequestItem => ({
  id: Date.now() + Math.floor(Math.random() * 10000),
  type: 'Desktop',
  customType: '',
  processor: '',
  ram: '',
  quantity: 1,
});

const Requests = () => {
  
  const confirmDialog = useConfirm();
const { currentUser, canViewAll } = useAuth();
  const canManageRequests = canViewAll();

  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('active');
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [view, setView] = useState<'form' | 'list'>(canManageRequests ? 'list' : 'form');
  const [activePrintRequest, setActivePrintRequest] = useState<any>(null);
  const [approvingExecs, setApprovingExecs] = useState<Record<string, (typeof EXECUTIVES)[number]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requestor, setRequestor] = useState({ name: '', department: '', manager: '' });
  const [items, setItems] = useState<RequestItem[]>([createDefaultItem()]);

  const departmentOptions = useMemo(() => Object.keys(DEPT_MANAGER_MAP).sort(), []);

  const loadRequests = async (nextScope: Scope = scope) => {
    setLoading(true);
    try {
      const rows = await api.requests.list(nextScope);
      setAllRequests(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(scope);
  }, [scope]);

  useEffect(() => {
    if (!currentUser) return;

    const safeDepartment =
      currentUser.department && DEPT_MANAGER_MAP[currentUser.department]
        ? currentUser.department
        : departmentOptions[0] || '';

    setRequestor({
      name: currentUser.name,
      department: safeDepartment,
      manager: DEPT_MANAGER_MAP[safeDepartment] || '',
    });
  }, [currentUser, departmentOptions]);

  useEffect(() => {
    setView(canManageRequests ? 'list' : 'form');
  }, [canManageRequests]);

  const monthOptions = useMemo(() => {
    const options = new Set<string>();
    allRequests.forEach((request) => {
      if (!request.dateSubmitted) return;
      const dateParts = String(request.dateSubmitted).split(' ');
      if (dateParts.length >= 3) {
        options.add(`${dateParts[0]} ${dateParts[2]}`);
      }
    });
    return Array.from(options);
  }, [allRequests]);

  const visibleRequests = useMemo(() => {
    const scopedRequests = canManageRequests
      ? allRequests
      : allRequests.filter(
          (request) =>
            request.submittedById === currentUser?.id ||
            (!request.submittedById && request.requestorName === currentUser?.name),
        );

    return scopedRequests.filter((request) => {
      const matchesSearch =
        (request.requestNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (request.requestorName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (request.department?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const dateParts = String(request.dateSubmitted || '').split(' ');
      const monthYear = dateParts.length >= 3 ? `${dateParts[0]} ${dateParts[2]}` : 'Unknown';
      const matchesDate = dateFilter === '' || monthYear === dateFilter;
      const matchesStatus = statusFilter === '' || request.status === statusFilter;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [allRequests, canManageRequests, currentUser?.id, currentUser?.name, dateFilter, searchQuery, statusFilter]);

  const pendingCount = useMemo(
    () =>
      allRequests.filter(
        (request) => request.status === 'Pending' && Number(request.isArchived || 0) !== 1,
      ).length,
    [allRequests],
  );

  const addItem = () => {
    
  const confirmDialog = useConfirm();
setItems((current) => [...current, createDefaultItem()]);
  };

  const removeItem = (id: number) => {
    
  const confirmDialog = useConfirm();
setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  };

  const updateItem = (id: number, field: keyof RequestItem, value: string | number) => {
    
  const confirmDialog = useConfirm();
setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        const updatedItem = { ...item, [field]: value };

        if (field === 'type') {
          const nextType = String(value);
          const requiresSpecs = nextType === 'Desktop' || nextType === 'Laptop';

          if (!requiresSpecs) {
            updatedItem.processor = 'N/A';
            updatedItem.ram = 'N/A';
          } else {
            if (updatedItem.processor === 'N/A') updatedItem.processor = '';
            if (updatedItem.ram === 'N/A') updatedItem.ram = '';
          }
        }

        return updatedItem;
      }),
    );
  };

  const handleDepartmentChange = (department: string) => {
    
  const confirmDialog = useConfirm();
setRequestor((current) => ({
      ...current,
      department,
      manager: DEPT_MANAGER_MAP[department] || '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    const missingSpecs = items.some(
      (item) =>
        (item.type === 'Desktop' || item.type === 'Laptop') &&
        (!item.processor.trim() || !item.ram.trim()),
    );

    if (missingSpecs) {
      alert('Please select both processor and memory for all desktop or laptop requests.');
      return;
    }

    const requestNumber = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await api.requests.create({
        requestNumber,
        requestorName: requestor.name,
        department: requestor.department,
        managerName: requestor.manager,
        dateSubmitted: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        items,
        submittedById: currentUser.id,
        submittedByEmail: currentUser.email,
      });

      await loadRequests('active');
      setScope('active');
      setItems([createDefaultItem()]);
      setView('list');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      await api.requests.updateStatus(id, newStatus);
      await loadRequests();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleArchiveRequest = async (request: any) => {
    const ok = await confirmDialog({
  title: 'Archive Request',
  message: `Archive ${request.requestNumber}?`,
  confirmText: 'Archive',
  cancelText: 'Cancel',
  danger: true,
});
if (!ok) return;
    try {
      await api.requests.archive(request.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await loadRequests();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRestoreRequest = async (request: any) => {
    try {
      await api.requests.restore(request.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await loadRequests();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openPrintPreview = (request: any) => {
    
  const confirmDialog = useConfirm();
const selectedExec = approvingExecs[request.id] || EXECUTIVES[0];
    setActivePrintRequest({ ...request, approvingExecutive: selectedExec });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
          Syncing request records...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
            {view === 'form'
              ? 'Asset Requisition'
              : canManageRequests
                ? 'Request Management'
                : 'My Request History'}
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
            Central Books Asset Management
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
            <button
              onClick={() => setView('form')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all',
                view === 'form'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
              )}
            >
              <FilePlus size={14} /> {canManageRequests ? 'New Form' : 'New Request'}
            </button>

            <button
              onClick={() => setView('list')}
              className={cn(
                'relative flex items-center gap-2 rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all',
                view === 'list'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
              )}
            >
              <ListFilter size={14} /> {canManageRequests ? 'Request List' : 'My History'}
              {canManageRequests && pendingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-white text-[10px] font-black text-red-600">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          </div>

          {view === 'list' ? (
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-[#0f121d]">
              {(['active', 'archived', 'all'] as Scope[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setScope(value)}
                  className={cn(
                    'rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all',
                    scope === value
                      ? 'bg-red-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {view === 'form' ? (
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
          <div className="grid grid-cols-1 gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl md:grid-cols-3 dark:border-slate-800 dark:bg-[#0f121d]">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                <User size={12} /> Full Name
              </label>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#050505] dark:text-slate-400">
                {requestor.name || 'â€”'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                <Building2 size={12} /> Department
              </label>
              <div className="relative">
                <select
                  value={requestor.department}
                  onChange={(event) => handleDepartmentChange(event.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-red-500 dark:border-slate-800 dark:bg-[#050505] dark:text-white"
                >
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                <UserCheck size={12} /> Dept Manager
              </label>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                {requestor.manager || 'No mapped manager'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const requiresSpecs = item.type === 'Desktop' || item.type === 'Laptop';

              return (
                <div
                  key={item.id}
                  className="relative space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]"
                >
                  {items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="absolute right-4 top-4 text-slate-500 transition-colors hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                        Device Type & Notes
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={item.type}
                          onChange={(event) => updateItem(item.id, 'type', event.target.value)}
                          className="w-1/3 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-red-500 dark:border-slate-800 dark:bg-[#050505] dark:text-white"
                        >
                          {DEVICE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Notes (Model, etc)..."
                          value={item.customType}
                          onChange={(event) => updateItem(item.id, 'customType', event.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 dark:border-slate-800 dark:bg-[#050505] dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                        <Layers size={12} /> Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, 'quantity', Number.parseInt(event.target.value || '1', 10))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 dark:border-slate-800 dark:bg-[#050505] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                        <Cpu size={12} /> Processor
                      </label>
                      <select
                        value={requiresSpecs ? item.processor : 'N/A'}
                        disabled={!requiresSpecs}
                        onChange={(event) => updateItem(item.id, 'processor', event.target.value)}
                        className={cn(
                          'w-full rounded-lg border px-4 py-3 text-sm outline-none transition-all',
                          requiresSpecs
                            ? 'cursor-pointer border-slate-200 bg-slate-50 text-slate-900 focus:border-red-500 dark:border-slate-800 dark:bg-[#050505] dark:text-white'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500',
                        )}
                      >
                        <option value="">Select processor</option>
                        {PROCESSOR_OPTIONS.map((processor) => (
                          <option key={processor} value={processor}>
                            {processor}
                          </option>
                        ))}
                        {!requiresSpecs ? <option value="N/A">N/A</option> : null}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                        <MemoryStick size={12} /> Memory
                      </label>
                      <select
                        value={requiresSpecs ? item.ram : 'N/A'}
                        disabled={!requiresSpecs}
                        onChange={(event) => updateItem(item.id, 'ram', event.target.value)}
                        className={cn(
                          'w-full rounded-lg border px-4 py-3 text-sm outline-none transition-all',
                          requiresSpecs
                            ? 'cursor-pointer border-slate-200 bg-slate-50 text-slate-900 focus:border-red-500 dark:border-slate-800 dark:bg-[#050505] dark:text-white'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500',
                        )}
                      >
                        <option value="">Select memory</option>
                        {RAM_OPTIONS.map((ram) => (
                          <option key={ram} value={ram}>
                            {ram}
                          </option>
                        ))}
                        {!requiresSpecs ? <option value="N/A">N/A</option> : null}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addItem}
              className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-4 text-[10px] font-bold uppercase text-slate-500 transition-all hover:border-red-500/50 hover:text-red-500 dark:border-slate-800"
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={12} /> Add Item Row
              </span>
            </button>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 py-5 font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all hover:bg-red-700"
          >
            <Send size={20} /> Submit Formal Request
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="relative md:col-span-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder={canManageRequests ? 'Search by Req #, Name, or Department...' : 'Search my requests...'}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-wider text-slate-900 outline-none shadow-xl placeholder:text-slate-400 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:placeholder:text-slate-600"
              />
            </div>

            <div className="relative md:col-span-3">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-8 text-xs font-bold uppercase tracking-wider text-slate-900 outline-none shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:text-white"
              >
                <option value="">All Dates</option>
                {monthOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            </div>

            <div className="relative md:col-span-3">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-8 text-xs font-bold uppercase tracking-wider text-slate-900 outline-none shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:text-white"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f121d]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-[#161b29] dark:text-slate-500">
                  <th className="px-6 py-5">Req #</th>
                  <th className="px-6 py-5">{canManageRequests ? 'Requestor' : 'Details'}</th>
                  {canManageRequests ? <th className="px-6 py-5">Approval (Sibal Brothers)</th> : null}
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {visibleRequests.map((request) => {
                  const isOwner =
                    request.submittedById === currentUser?.id ||
                    (!request.submittedById && request.requestorName === currentUser?.name);

                  const isArchived = Number(request.isArchived || 0) === 1;
                  const canArchiveThisRequest = !isArchived && (canManageRequests || isOwner);
                  const canRestoreThisRequest = isArchived && (canManageRequests || isOwner);

                  return (
                    <tr
                      key={request.id}
                      className={cn(
                        'transition-all hover:bg-slate-50 dark:hover:bg-white/2',
                        isArchived && 'opacity-70',
                      )}
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold text-red-500">
                        <div className="flex items-center gap-2">
                          <span>{request.requestNumber}</span>
                          {isArchived ? (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-500">
                              Archived
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[8px] font-bold uppercase text-slate-500">
                          {request.dateSubmitted || 'No Date'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                          {request.requestorName}
                        </div>
                        <div className="text-[9px] font-bold uppercase text-slate-500">
                          {request.department}
                        </div>
                      </td>

                      {canManageRequests ? (
                        <td className="px-6 py-4">
                          <div className="relative w-56">
                            <select
                              value={approvingExecs[request.id]?.name || EXECUTIVES[0].name}
                              onChange={(event) => {
                                const executive = EXECUTIVES.find((entry) => entry.name === event.target.value);
                                if (!executive) return;
                                setApprovingExecs((current) => ({ ...current, [request.id]: executive }));
                              }}
                              disabled={isArchived}
                              className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-[10px] font-black uppercase text-slate-700 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-[#050505] dark:text-slate-300"
                            >
                              {EXECUTIVES.map((executive) => (
                                <option key={executive.name} value={executive.name}>
                                  {executive.name.split(' ').pop()} - {executive.title}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={12}
                              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                          </div>
                        </td>
                      ) : null}

                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'rounded px-2 py-1 text-[9px] font-black uppercase',
                            request.status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : request.status === 'Rejected'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-amber-500/10 text-amber-500',
                          )}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openPrintPreview(request)}
                            className="rounded-lg bg-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                          >
                            <Printer size={14} />
                          </button>

                          {canManageRequests && request.status === 'Pending' && !isArchived ? (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(request.id, 'Approved')}
                                className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(request.id, 'Rejected')}
                                className="rounded-lg bg-red-500/10 p-2 text-red-500"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          ) : null}

                          {canArchiveThisRequest ? (
                            <button
                              onClick={() => handleArchiveRequest(request)}
                              className="rounded-lg bg-red-500/10 p-2 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                              title="Archive request"
                            >
                              <Archive size={14} />
                            </button>
                          ) : null}

                          {canRestoreThisRequest ? (
                            <button
                              onClick={() => handleRestoreRequest(request)}
                              className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 transition-colors hover:bg-emerald-500 hover:text-white"
                              title="Restore request"
                            >
                              <RotateCcw size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visibleRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManageRequests ? 5 : 4}
                      className="px-6 py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-500"
                    >
                      {canManageRequests ? 'No matching requests found' : 'No request history found'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activePrintRequest ? (
        <PrintableRequest request={activePrintRequest} onClose={() => setActivePrintRequest(null)} />
      ) : null}
    </div>
  );
};

export default Requests;


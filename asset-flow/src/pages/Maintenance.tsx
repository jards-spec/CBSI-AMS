import React, { useEffect, useMemo, useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Archive,
  RotateCcw,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  assetId?: string;
  category: 'Hardware' | 'Software' | 'Network' | 'Other';
  cost?: number;
  isArchived?: number;
  archivedAt?: string | null;
  archivedById?: string | null;
  archivedByName?: string | null;
}

type Scope = 'active' | 'archived' | 'all';

const defaultForm = {
  title: '',
  description: '',
  priority: 'Medium' as Ticket['priority'],
  category: 'Hardware' as Ticket['category'],
  assetId: '',
  cost: 0,
};

const Maintenance = () => {
  const { currentUser, canViewAll } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [formData, setFormData] = useState(defaultForm);

  const loadTickets = async (nextScope: Scope = scope) => {
    setLoading(true);
    try {
      const rows = await api.maintenance.list(nextScope);
      setTickets(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load maintenance tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(scope);
  }, [scope]);

  const visibleTickets = useMemo(() => {
    let filtered = canViewAll()
      ? tickets
      : tickets.filter((ticket) => ticket.submittedById === currentUser?.id);

    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    return [...filtered].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [canViewAll, currentUser?.id, priorityFilter, searchQuery, statusFilter, tickets]);

  const resetForm = () => {
    setEditingTicket(null);
    setFormData(defaultForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    const payload = {
      ...formData,
      status: editingTicket?.status || 'Open',
      submittedBy: editingTicket?.submittedBy || currentUser.name,
      submittedById: editingTicket?.submittedById || currentUser.id,
      submittedAt: editingTicket?.submittedAt || new Date().toISOString(),
      cost: formData.cost || editingTicket?.cost || 0,
    };

    try {
      if (editingTicket) {
        await api.maintenance.update(editingTicket.id, payload);
      } else {
        await api.maintenance.create(payload);
      }
      await loadTickets();
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      assetId: ticket.assetId || '',
      cost: ticket.cost || 0,
    });
    setIsModalOpen(true);
  };

  const handleArchive = async (ticket: Ticket) => {
    if (!window.confirm('Archive this ticket?')) return;
    try {
      await api.maintenance.archive(ticket.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await loadTickets();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRestore = async (ticket: Ticket) => {
    try {
      await api.maintenance.restore(ticket.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await loadTickets();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: Ticket['status']) => {
    const ticket = tickets.find((entry) => entry.id === ticketId);
    if (!ticket) return;

    try {
      await api.maintenance.update(ticketId, { ...ticket, status: newStatus });
      await loadTickets();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'border-red-600/50 bg-red-600/10 text-red-600 dark:text-red-500';
      case 'High':
        return 'border-orange-600/50 bg-orange-600/10 text-orange-600 dark:text-orange-500';
      case 'Medium':
        return 'border-yellow-600/50 bg-yellow-600/10 text-yellow-600 dark:text-yellow-500';
      case 'Low':
        return 'border-blue-600/50 bg-blue-600/10 text-blue-600 dark:text-blue-500';
      default:
        return 'border-slate-600/50 bg-slate-600/10 text-slate-600 dark:text-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return <Clock size={16} className="text-blue-500" />;
      case 'In Progress':
        return <Wrench size={16} className="text-yellow-500" />;
      case 'Resolved':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'Closed':
        return <XCircle size={16} className="text-slate-500" />;
      default:
        return <Clock size={16} className="text-blue-500" />;
    }
  };

  const canEditTicket = (ticket: Ticket) => canViewAll() || ticket.submittedById === currentUser?.id;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-slate-500">
          Syncing maintenance tickets...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">
            <Wrench className="text-red-600" size={32} />
            Maintenance <span className="text-red-600">Tickets</span>
          </h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
            CentralBooks Vantage // {visibleTickets.length} Ticket{visibleTickets.length === 1 ? '' : 's'} Visible
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-2xl border border-slate-300 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            {(['active', 'archived', 'all'] as Scope[]).map((value) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                className={cn(
                  'rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all',
                  scope === value
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
                )}
              >
                {value}
              </button>
            ))}
          </div>

          {canViewAll() ? (
            <>
              <div className="group relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-500" size={16} />
                <input
                  type="text"
                  placeholder="SEARCH TICKETS..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-64 rounded-2xl border border-slate-300 bg-white py-4 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-600 shadow-lg dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:placeholder:text-slate-700"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="cursor-pointer appearance-none rounded-2xl border border-slate-300 bg-white py-4 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none transition-all hover:border-slate-400 shadow-lg dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:hover:border-slate-600"
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="cursor-pointer appearance-none rounded-2xl border border-slate-300 bg-white py-4 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none transition-all hover:border-slate-400 shadow-lg dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:hover:border-slate-600"
              >
                <option value="All">All Priority</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </>
          ) : null}

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-red-600 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-950/20 transition-all hover:bg-red-700"
          >
            <Plus size={18} strokeWidth={4} /> Submit Ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {visibleTickets.map((ticket) => {
          const isArchived = Number(ticket.isArchived || 0) === 1;

          return (
            <div
              key={ticket.id}
              className={cn(
                'group relative overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl transition-all duration-300 hover:border-red-600/40 dark:border-slate-800 dark:bg-[#0f121d]',
                isArchived && 'opacity-75',
              )}
            >
              <div className="p-8">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">
                        {ticket.title}
                      </h3>

                      <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 ${getPriorityColor(ticket.priority)}`}>
                        <AlertTriangle size={14} />
                        <span className="text-[9px] font-black uppercase tracking-wider">{ticket.priority}</span>
                      </div>

                      {isArchived ? (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-amber-500">
                          Archived
                        </div>
                      ) : null}
                    </div>

                    <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{ticket.description}</p>

                    <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                      <span>#{ticket.id}</span>
                      <span>{ticket.category}</span>
                      <span>By: {ticket.submittedBy}</span>
                      <span>{new Date(ticket.submittedAt).toLocaleDateString()}</span>
                      {ticket.cost !== undefined && ticket.cost > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <DollarSign size={10} />
                          {ticket.cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusIcon(ticket.status)}
                    {canViewAll() && !isArchived ? (
                      <select
                        value={ticket.status}
                        onChange={(event) => handleStatusChange(ticket.id, event.target.value as Ticket['status'])}
                        className="cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase text-slate-900 outline-none hover:border-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-500">
                        {ticket.status}
                      </span>
                    )}
                  </div>
                </div>

                {canEditTicket(ticket) ? (
                  <div className="flex gap-3 border-t border-slate-200 pt-4 dark:border-slate-800/50">
                    {!isArchived ? (
                      <>
                        <button
                          onClick={() => handleEdit(ticket)}
                          className="rounded-xl border border-slate-300 bg-slate-100 p-3 text-slate-600 transition-all hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-white"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleArchive(ticket)}
                          className="rounded-xl border border-slate-300 bg-slate-100 p-3 text-slate-600 transition-all hover:border-red-300 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-red-900/50 dark:hover:text-red-500"
                        >
                          <Archive size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestore(ticket)}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-500"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {visibleTickets.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 py-32 text-center shadow-xl dark:border-slate-800 dark:bg-[#0a0c14]">
          <AlertTriangle className="mx-auto mb-6 text-slate-400 dark:text-slate-800" size={64} />
          <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-600 italic">
            {canViewAll() ? 'No Tickets Found' : 'You Have No Ticket History Yet'}
          </p>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f121d]">
            <div className="border-b border-slate-200 p-8 dark:border-slate-800/50">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">
                {editingTicket ? 'Edit' : 'Submit'} <span className="text-red-600">Ticket</span>
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                  Ticket Title
                </label>
                <input
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#05070a] dark:text-white"
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                  Description
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#05070a] dark:text-white"
                  placeholder="Detailed description of the issue..."
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Category
                  </label>
                  <select
                    required
                    className="w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 p-4 text-[10px] font-black uppercase text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#05070a] dark:text-white"
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value as Ticket['category'] })}
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Network">Network</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Priority
                  </label>
                  <select
                    required
                    className="w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 p-4 text-[10px] font-black uppercase text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#05070a] dark:text-white"
                    value={formData.priority}
                    onChange={(event) => setFormData({ ...formData, priority: event.target.value as Ticket['priority'] })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Asset ID (Optional)
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#05070a] dark:text-white"
                    placeholder="Related asset identifier"
                    value={formData.assetId}
                    onChange={(event) => setFormData({ ...formData, assetId: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                    Maintenance Cost (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#05070a] dark:text-white"
                    placeholder="0.00"
                    value={formData.cost || ''}
                    onChange={(event) => setFormData({ ...formData, cost: parseFloat(event.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-2xl border border-slate-300 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-800 dark:text-slate-500 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-red-600 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-red-950/40 transition-all hover:bg-red-700"
                >
                  {editingTicket ? 'Update' : 'Submit'} Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Maintenance;
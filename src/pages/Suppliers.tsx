import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  LayoutGrid,
  List,
  Archive,
  RotateCcw,
  Mail,
  Phone,
  Globe,
  Building2,
  User,
  MapPin,
  Tag,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

type Scope = 'active' | 'archived' | 'all';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  category: string;
  notes: string;
  createdAt: string;
  isArchived: number;
}

const Suppliers = () => {
  
  const confirmDialog = useConfirm();
const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [scope, setScope] = useState<Scope>('active');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const refresh = async (nextScope: Scope = scope) => {
    try {
      const rows = await api.suppliers.list(nextScope);
      setSuppliers(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  useEffect(() => {
    refresh(scope);
  }, [scope]);

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contactPerson, supplier.email, supplier.category, supplier.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [suppliers, searchQuery]);

  const handleSave = async (formData: any) => {
    try {
      if (editingSupplier) {
        await api.suppliers.update(editingSupplier.id, formData);
      } else {
        await api.suppliers.create(formData);
      }
      await refresh();
      setEditingSupplier(null);
      setIsModalOpen(false);
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleArchive = async (supplier: Supplier) => {
    const ok = await confirmDialog({
  title: 'Archive Supplier',
  message: `Archive ${supplier.name}?`,
  confirmText: 'Archive',
  cancelText: 'Cancel',
  danger: true,
});
if (!ok) return;
    try {
      await api.suppliers.archive(supplier.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  const handleRestore = async (supplier: Supplier) => {
    try {
      await api.suppliers.restore(supplier.id, {
        archivedById: currentUser?.id,
        archivedByName: currentUser?.name,
      });
      await refresh();
    } catch (error: any) {
      console.warn(error.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Suppliers
          </h1>
          <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-500">
            Manage vendor and supplier information.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            {(['active', 'archived', 'all'] as Scope[]).map((value) => (
              <button
                key={value}
                onClick={() => setScope(value)}
                className={cn(
                  'rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all',
                  scope === value
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white',
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-[#0f121d]">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-lg p-2 transition-all',
                viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-slate-600 dark:text-slate-500',
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-lg p-2 transition-all',
                viewMode === 'table' ? 'bg-red-600 text-white' : 'text-slate-600 dark:text-slate-500',
              )}
            >
              <List size={16} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-600 dark:border-slate-800 dark:bg-[#0f121d] dark:text-white dark:placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={() => {
              setEditingSupplier(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all active:scale-95 hover:bg-red-700"
          >
            <Plus size={16} strokeWidth={3} /> Add Supplier
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredSuppliers.map((supplier) => {
            const isArchived = Number(supplier.isArchived || 0) === 1;

            return (
              <div
                key={supplier.id}
                className={cn(
                  'rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl',
                  isArchived && 'opacity-70',
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-red-600/10 p-3">
                      <Building2 className="text-red-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                        {supplier.name}
                      </h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500">
                        {supplier.category || 'General Supplier'}
                      </p>
                    </div>
                  </div>
                  {isArchived ? (
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-amber-500">
                      Archived
                    </span>
                  ) : null}
                </div>

                <div className="mb-4 space-y-2 text-[11px]">
                  {supplier.contactPerson && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <User size={12} />
                      <span>{supplier.contactPerson}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail size={12} />
                      <span className="italic">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone size={12} />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                      <MapPin size={12} className="mt-0.5" />
                      <span>{supplier.address}</span>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Globe size={12} />
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                        {supplier.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {supplier.notes && (
                  <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2">{supplier.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!isArchived ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setIsModalOpen(true);
                        }}
                        className="rounded bg-orange-500/10 p-2 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleArchive(supplier)}
                        className="rounded bg-red-500/10 p-2 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <Archive size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestore(supplier)}
                      className="rounded bg-emerald-500/10 p-2 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-500">
                <th className="px-5 py-4">Supplier</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Contact Person</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Website</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
              {filteredSuppliers.map((supplier) => {
                const isArchived = Number(supplier.isArchived || 0) === 1;

                return (
                  <tr
                    key={supplier.id}
                    className={cn(
                      'text-[11px] transition-colors hover:bg-slate-50 dark:hover:bg-white/2',
                      isArchived && 'opacity-70',
                    )}
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-600/10 p-2">
                          <Building2 className="text-red-600" size={14} />
                        </div>
                        <div>
                          <div className="font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                            {supplier.name}
                          </div>
                          {supplier.address && (
                            <div className="text-[9px] text-slate-500">{supplier.address}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase dark:bg-white/10">
                        {supplier.category || 'General'}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <User size={12} />
                        <span>{supplier.contactPerson || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      {supplier.email ? (
                        <a href={`mailto:${supplier.email}`} className="text-red-600 hover:underline italic">
                          {supplier.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-5 text-slate-600 dark:text-slate-400">
                      {supplier.phone || 'N/A'}
                    </td>
                    <td className="px-5 py-5">
                      {supplier.website ? (
                        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                          {supplier.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {!isArchived ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setIsModalOpen(true);
                              }}
                              className="rounded bg-orange-500/10 p-1.5 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                            >
                              <Edit2 size={12} strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleArchive(supplier)}
                              className="rounded bg-red-500/10 p-1.5 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                            >
                              <Archive size={12} strokeWidth={3} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(supplier)}
                            className="rounded bg-emerald-500/10 p-1.5 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                          >
                            <RotateCcw size={12} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
                    No suppliers found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setEditingSupplier(null);
            setIsModalOpen(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

const SupplierModal = ({ supplier, onClose, onSave }: { supplier: Supplier | null; onClose: () => void; onSave: (data: any) => void }) => {
  const isEditing = !!supplier;

  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    website: supplier?.website || '',
    category: supplier?.category || '',
    notes: supplier?.notes || '',
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    
  const confirmDialog = useConfirm();
e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-[#0f121d] shadow-2xl max-h-[95vh] overflow-y-auto">
        <div className="border-b border-slate-800 p-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">
            {isEditing ? 'Update' : 'Add'} <span className="text-red-600">Supplier</span>
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Supplier Name *</label>
              <input
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none focus:border-red-500 transition-all"
                placeholder="e.g. ABC Technology Solutions"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Contact Person</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-red-500"
                  placeholder="John Doe"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-red-500"
                  placeholder="e.g. IT Equipment, Office Supplies"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  type="email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-red-500"
                  placeholder="contact@supplier.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-red-500"
                  placeholder="+63 XXX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-600" size={14} />
                <textarea
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-red-500 resize-none"
                  placeholder="Complete business address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  type="url"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-red-500"
                  placeholder="https://www.supplier.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Notes</label>
              <textarea
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none focus:border-red-500 resize-none"
                placeholder="Additional information about this supplier..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-red-600 px-10 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-red-500 shadow-lg shadow-red-900/40 active:scale-95 transition-all"
            >
              {isEditing ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Suppliers;



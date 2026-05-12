import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Package, RotateCcw, User, X, Hash } from 'lucide-react';

type ResourceType = 'asset' | 'component' | 'accessory' | 'consumable' | 'license';
type Mode = 'checkout' | 'checkin';

interface TransactionModalProps {
  isOpen: boolean;
  mode: Mode;
  resourceType: ResourceType;
  item: any;
  employees?: any[];
  assets?: any[];
  activeAssignments?: any[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void> | void;
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_LIST: any[] = [];

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  mode,
  resourceType,
  item,
  employees,
  assets,
  activeAssignments,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Available');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(today());
  const [expectedCheckinDate, setExpectedCheckinDate] = useState('');
  const [notes, setNotes] = useState('');

  const assetAssignments = useMemo(() => {
  return Array.isArray(activeAssignments) ? activeAssignments.filter(Boolean) : EMPTY_LIST;
}, [activeAssignments]);

  const selectedAssignment = useMemo(() => {
    if (!assetAssignments.length) return null;
    return (
      assetAssignments.find((entry) => String(entry.id) === String(assignmentId)) ||
      (assetAssignments.length === 1 ? assetAssignments[0] : null)
    );
  }, [assetAssignments, assignmentId]);

  const activeAssets = useMemo(() => {
  return Array.isArray(assets)
    ? assets.filter((asset) => Number(asset.isArchived || 0) !== 1)
    : EMPTY_LIST;
}, [assets]);

  const activeEmployees = useMemo(() => {
  return Array.isArray(employees)
    ? employees.filter((employee) => Number(employee.isArchived || 0) !== 1)
    : EMPTY_LIST;
}, [employees]);

  const getAssetLabel = (asset: any) => {
    if (!asset) return 'Unknown Asset';
    if (asset.tag && asset.name) return `${asset.tag} — ${asset.name}`;
    return asset.name || asset.tag || asset.id || 'Unknown Asset';
  };

  const getAssignmentLabel = (assignment: any) => {
    const linkedAsset = activeAssets.find((asset) => String(asset.id) === String(assignment.assetId));
    const assetLabel = linkedAsset
      ? getAssetLabel(linkedAsset)
      : assignment.assetTag
        ? `${assignment.assetTag} — ${assignment.assetName || 'Unknown Asset'}`
        : assignment.assetName || assignment.assetId || 'Unknown Asset';

    const qty = Number(assignment.quantity || 1);
    return `${assetLabel}${qty > 1 ? ` (${qty})` : ''}`;
  };

  const getEmployeeLabel = (employee: any) => {
    const number = employee?.employeeNumber ? String(employee.employeeNumber).toUpperCase() : 'NO-ID';
    const name = employee?.name || 'Unknown Employee';
    const department = employee?.department || 'Unassigned';
    return `${number} — ${name} (${department})`;
  };

  useEffect(() => {
    if (!isOpen) return;

    setEmployeeId('');
    setAssetId('');
    setAssignmentId('');
    setLocation(item?.location || '');
    setStatus(resourceType === 'asset' ? 'Available' : 'AVAILABLE');
    setQuantity(1);
    setDate(today());
    setExpectedCheckinDate('');
    setNotes('');

    const usesAssetAssignment = resourceType === 'component' || resourceType === 'accessory';

    if (usesAssetAssignment && mode === 'checkin' && assetAssignments.length === 1) {
      const onlyAssignment = assetAssignments[0];
      setAssignmentId(String(onlyAssignment.id));
      setAssetId(String(onlyAssignment.assetId || ''));
      setQuantity(Math.max(1, Number(onlyAssignment.quantity || 1)));
      setNotes(onlyAssignment.notes || '');
    }
  }, [isOpen, item, mode, resourceType, assetAssignments]);

  useEffect(() => {
    if (!selectedAssignment) return;
    setAssetId(String(selectedAssignment.assetId || ''));
    setQuantity((current) =>
      Math.min(Math.max(1, current), Math.max(1, Number(selectedAssignment.quantity || 1))),
    );
  }, [selectedAssignment]);

  const config = useMemo(() => {
    const nounMap: Record<ResourceType, string> = {
      asset: 'Asset',
      component: 'Component',
      accessory: 'Accessory',
      consumable: 'Consumable',
      license: 'License',
    };

    const usesAssetAssignment = resourceType === 'component' || resourceType === 'accessory';

    const action =
      mode === 'checkout'
        ? usesAssetAssignment
          ? 'Install'
          : 'Check Out'
        : usesAssetAssignment
          ? 'Remove'
          : 'Check In';

    return {
      title: `${action} ${nounMap[resourceType]}`,
      submitLabel: action,
      accent:
        mode === 'checkout'
          ? 'bg-[#d63384] hover:bg-[#b52a6f] shadow-pink-900/20'
          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20',
      icon: mode === 'checkout' ? <Package size={20} /> : <RotateCcw size={20} />,
    };
  }, [mode, resourceType]);

  if (!isOpen || !item) return null;

  const availableAccessory = Math.max(0, Number(item.total || 0) - Number(item.checkedOut || 0));
  const checkedOutAccessory = Number(item.checkedOut || 0);
  const remainingConsumable = Number(item.remaining || 0);
  const remainingComponents = Number(item.remaining ?? item.total ?? 0);
  const selectedAssignmentQty = Number(selectedAssignment?.quantity || 0);

  const maxQuantity =
    resourceType === 'component'
      ? mode === 'checkout'
        ? Math.max(1, remainingComponents)
        : Math.max(1, selectedAssignmentQty || Number(item.total || 0) - remainingComponents)
      : resourceType === 'accessory'
        ? mode === 'checkout'
          ? Math.max(1, availableAccessory)
          : Math.max(1, selectedAssignmentQty || checkedOutAccessory)
        : resourceType === 'consumable'
          ? mode === 'checkout'
            ? Math.max(1, remainingConsumable)
            : Math.max(1, Number(item.total || 0) - remainingConsumable)
          : resourceType === 'license'
            ? mode === 'checkout'
              ? Math.max(1, Number(item.avail || 0))
              : Math.max(1, Number(item.total || 0) - Number(item.avail || 0))
            : 1;

  const usesAssetAssignment = resourceType === 'component' || resourceType === 'accessory';
  const requiresEmployee =
  (resourceType === 'asset' || resourceType === 'license') && mode === 'checkout';
  const requiresAssetSelection = usesAssetAssignment && mode === 'checkout';
  const requiresAssignmentSelection = usesAssetAssignment && mode === 'checkin' && assetAssignments.length > 1;

  const showsLocation = resourceType === 'asset';
  const showsStatus = resourceType === 'asset' && mode === 'checkin';
  const showsQuantity =
    resourceType === 'component' ||
    resourceType === 'accessory' ||
    resourceType === 'consumable' ||
    resourceType === 'license';
  const showsExpectedDate = (resourceType === 'asset' || resourceType === 'component') && mode === 'checkout';
  const showsDate = resourceType === 'asset' || resourceType === 'component';

  const selectedEmployee = activeEmployees.find((employee) => String(employee.id) === String(employeeId));

  const handleSubmit = async () => {
    const payload: any = {
      resourceType,
      itemId: item.id,
      notes: notes.trim() || undefined,
    };

    if (requiresEmployee) payload.employeeId = employeeId;
    if (showsLocation && location.trim()) payload.location = location.trim();
    if (showsStatus) payload.status = status;
    if (showsQuantity) payload.quantity = quantity;
    if (showsDate) payload.checkoutDate = date;
    if (showsExpectedDate && expectedCheckinDate) payload.expectedCheckinDate = expectedCheckinDate;

    if (usesAssetAssignment) {
      if (mode === 'checkout') {
        payload.assetId = assetId;
      } else {
        if (selectedAssignment?.id) payload.assignmentId = selectedAssignment.id;
        if (selectedAssignment?.assetId || assetId) {
          payload.assetId = selectedAssignment?.assetId || assetId;
        }
      }
    }

    await onSubmit(payload);
  };

  const isDisabled =
    loading ||
    (requiresEmployee && !employeeId) ||
    (requiresAssetSelection && !assetId) ||
    (requiresAssignmentSelection && !assignmentId) ||
    (usesAssetAssignment && mode === 'checkin' && assetAssignments.length === 0) ||
    (showsQuantity && (!quantity || quantity < 1));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0f121d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#161b29] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/5 p-3 text-white">{config.icon}</div>
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-white">
                {config.title}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {item.name}
                {item.tag ? <span className="ml-2 text-cyan-400">{item.tag}</span> : null}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-500 transition-colors hover:text-white"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-8">
          <div className="rounded-2xl border border-slate-800 bg-black/20 px-5 py-4">
            <div className="flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>
                Category: <span className="text-white">{item.category || 'N/A'}</span>
              </span>

              {'status' in item ? (
                <span>
                  Status: <span className="text-white">{item.status || 'N/A'}</span>
                </span>
              ) : null}

              {resourceType === 'component' ? (
                <span>
                  Remaining: <span className="text-white">{remainingComponents}</span>
                </span>
              ) : null}

              {resourceType === 'accessory' ? (
                <span>
                  Available: <span className="text-white">{availableAccessory}</span>
                </span>
              ) : null}

              {resourceType === 'consumable' ? (
                <span>
                  Remaining: <span className="text-white">{remainingConsumable}</span>
                </span>
              ) : null}

              {resourceType === 'license' ? (
                <span>
                  Available Seats: <span className="text-white">{item.avail ?? 0}</span>
                </span>
              ) : null}

              {usesAssetAssignment ? (
                <span>
                  Active Asset Links: <span className="text-white">{assetAssignments.length}</span>
                </span>
              ) : null}
            </div>
          </div>

          {requiresEmployee ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {resourceType === 'license' ? 'Licensed User' : 'Assigned Employee'}
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-3 text-[10px] font-black uppercase text-white outline-none focus:border-red-600"
                >
                  <option value="">Select employee</option>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {getEmployeeLabel(employee)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee?.employeeNumber ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <Hash size={12} className="text-red-500" />
                  {selectedEmployee.employeeNumber}
                </div>
              ) : null}
            </div>
          ) : null}

          {usesAssetAssignment && mode === 'checkout' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Attach To Asset
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase text-white outline-none focus:border-red-600"
              >
                <option value="">Select asset</option>
                {activeAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {getAssetLabel(asset)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {usesAssetAssignment && mode === 'checkin' && assetAssignments.length > 1 ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Remove From Asset
              </label>
              <select
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase text-white outline-none focus:border-emerald-600"
              >
                <option value="">Select active assignment</option>
                {assetAssignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {getAssignmentLabel(assignment)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {usesAssetAssignment && mode === 'checkin' && assetAssignments.length === 1 ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Installed On
              </label>
              <div className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase text-white">
                {getAssignmentLabel(assetAssignments[0])}
              </div>
            </div>
          ) : null}

          {usesAssetAssignment && mode === 'checkin' && assetAssignments.length === 0 ? (
            <div className="rounded-xl border border-amber-900/40 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-amber-400">
              No active asset assignment found for this item.
            </div>
          ) : null}

          {showsLocation ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase text-white outline-none focus:border-red-600"
                placeholder="e.g. Main Office"
              />
            </div>
          ) : null}

          {showsStatus ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Next Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase text-white outline-none focus:border-emerald-600"
              >
                <option value="Available">Available</option>
                <option value="Ready to Deploy">Ready to Deploy</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          ) : null}

          {showsQuantity ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.min(maxQuantity, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase text-white outline-none focus:border-red-600"
              />
            </div>
          ) : null}

          {showsDate ? (
            <div className={`grid gap-4 ${showsExpectedDate ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {mode === 'checkout' ? 'Checkout Date' : 'Checkin Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-3 text-[10px] font-black uppercase text-white outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {showsExpectedDate ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Expected Checkin
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                      type="date"
                      value={expectedCheckinDate}
                      onChange={(e) => setExpectedCheckinDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-3 text-[10px] font-black uppercase text-white outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[110px] w-full resize-none rounded-xl border border-slate-800 bg-slate-900 p-4 text-[10px] font-bold uppercase text-white outline-none focus:border-red-600"
              placeholder="Optional context for this transaction"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 bg-[#161b29] px-6 py-5">
          <button
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
            type="button"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            className={`flex items-center gap-2 rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${config.accent}`}
            type="button"
          >
            <Check size={14} />
            {loading ? 'Working...' : config.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
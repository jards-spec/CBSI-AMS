import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Hash,
  Building2,
  Briefcase,
  Phone,
  Pencil,
  Save,
  X,
  Upload,
  Package,
  Send,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { useConfirm } from '../context/ConfirmContext';

const roleBadgeStyles: Record<string, string> = {
  Admin: 'border-red-600/40 bg-red-600/10 text-red-500',
  Superuser: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500',
  User: 'border-blue-500/40 bg-blue-500/10 text-blue-500',
};

type ProfileFormState = {
  name: string;
  email: string;
  employeeNumber: string;
  department: string;
  role: string;
  avatar: string;
  phone: string;
  jobTitle: string;
  password: string;
};

const emptyProfileForm: ProfileFormState = {
  name: '',
  email: '',
  employeeNumber: '',
  department: '',
  role: 'User',
  avatar: '',
  phone: '',
  jobTitle: '',
  password: '',
};

const Profile = () => {
  
  const confirmDialog = useConfirm();
const { currentUser, updateCurrentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeRecord, setEmployeeRecord] = useState<any>(null);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [submittedRequests, setSubmittedRequests] = useState<any[]>([]);
  const [submittedTickets, setSubmittedTickets] = useState<any[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<ProfileFormState>(emptyProfileForm);

  const actor = currentUser
    ? { id: currentUser.id, role: currentUser.role }
    : null;

  const displayAvatar =
    employeeRecord?.avatar ||
    currentUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0f172a&color=38bdf8&size=256`;

  const loadProfileData = async () => {
    if (!currentUser || !actor) return;

    setLoading(true);
    try {
      const [mePayload, assetRows, requestRows, ticketRows] = await Promise.all([
        api.profile.me(actor),
        api.assets.list('all'),
        api.profile.myRequests('all', actor),
        api.profile.myMaintenance('all', actor),
      ]);

      const profileEmployee = mePayload?.profile || null;

      const profileAssets = assetRows.filter(
        (asset: any) => String(asset.employeeId || '') === String(currentUser.id),
      );

      setEmployeeRecord(profileEmployee);
      setAssignedAssets(profileAssets);
      setSubmittedRequests(requestRows || []);
      setSubmittedTickets(ticketRows || []);

      const nextFormState: ProfileFormState = {
        name: profileEmployee?.name || currentUser.name || '',
        email: profileEmployee?.email || currentUser.email || '',
        employeeNumber: profileEmployee?.employeeNumber || currentUser.employeeNumber || '',
        department: profileEmployee?.department || currentUser.department || '',
        role: profileEmployee?.role || currentUser.role || 'User',
        avatar: profileEmployee?.avatar || currentUser.avatar || '',
        phone: profileEmployee?.phone || currentUser.phone || '',
        jobTitle: profileEmployee?.jobTitle || currentUser.jobTitle || '',
        password: '',
      };

      setFormData(nextFormState);

      updateCurrentUser({
        name: nextFormState.name,
        email: nextFormState.email,
        employeeNumber: nextFormState.employeeNumber,
        department: nextFormState.department,
        role: nextFormState.role as 'Admin' | 'Superuser' | 'User',
        avatar: nextFormState.avatar,
        phone: nextFormState.phone,
        jobTitle: nextFormState.jobTitle,
      });
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setErrorMessage('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const sortedRequests = useMemo(() => {
    return [...submittedRequests].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dateSubmitted || 0).getTime();
      const dateB = new Date(b.createdAt || b.dateSubmitted || 0).getTime();
      return dateB - dateA;
    });
  }, [submittedRequests]);

  const sortedTickets = useMemo(() => {
    return [...submittedTickets].sort((a, b) => {
      const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [submittedTickets]);

  const openEdit = () => {
    
  const confirmDialog = useConfirm();
setErrorMessage('');
    setFormData({
      name: employeeRecord?.name || currentUser?.name || '',
      email: employeeRecord?.email || currentUser?.email || '',
      employeeNumber: employeeRecord?.employeeNumber || currentUser?.employeeNumber || '',
      department: employeeRecord?.department || currentUser?.department || '',
      role: employeeRecord?.role || currentUser?.role || 'User',
      avatar: employeeRecord?.avatar || currentUser?.avatar || '',
      phone: employeeRecord?.phone || currentUser?.phone || '',
      jobTitle: employeeRecord?.jobTitle || currentUser?.jobTitle || '',
      password: '',
    });
    setIsEditOpen(true);
  };

  const handleAvatarUpload = (file: File) => {
    
  const confirmDialog = useConfirm();
const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        avatar: typeof reader.result === 'string' ? reader.result : prev.avatar,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !actor) return;

    setSaving(true);
    setErrorMessage('');

    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        avatar: formData.avatar,
        phone: formData.phone.trim(),
      };

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      const confirmed = await confirmDialog({
  title: 'Confirm Action',
  message: 'Are you sure you want to continue?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  danger: true,
});

      if (!confirmed) {
        setSaving(false);
        return;
      }

      const result = await api.profile.updateMe(payload, actor);
      const updatedProfile = result?.profile || null;

      if (updatedProfile) {
        updateCurrentUser({
          name: updatedProfile.name || currentUser.name,
          email: updatedProfile.email || currentUser.email,
          employeeNumber: updatedProfile.employeeNumber || currentUser.employeeNumber,
          department: updatedProfile.department || currentUser.department,
          role: (updatedProfile.role || currentUser.role) as 'Admin' | 'Superuser' | 'User',
          avatar: updatedProfile.avatar || currentUser.avatar,
          phone: updatedProfile.phone || '',
          jobTitle: updatedProfile.jobTitle || '',
        });
      }

      await loadProfileData();
      setIsEditOpen(false);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const requestStatusStyle = (status: string) => {
    
  const confirmDialog = useConfirm();
switch (status) {
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const ticketStatusStyle = (status: string) => {
    
  const confirmDialog = useConfirm();
switch (status) {
      case 'Resolved':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Closed':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
          Loading profile workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0f121d] dark:shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-100 px-8 py-8 dark:border-slate-800 dark:bg-[#161b29]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">
                My <span className="text-red-600">Profile</span>
              </h1>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                Employee identity, activity, and self-service profile workspace
              </p>
            </div>

            <button
              onClick={openEdit}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-red-950/30 transition-all hover:bg-red-700"
            >
              <Pencil size={14} /> Edit Profile
            </button>
          </div>
        </div>

        <div className="grid gap-8 p-8 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-[#111624]">
              <div className="mx-auto mb-5 h-28 w-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <img
                  src={displayAvatar}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                {employeeRecord?.name || currentUser.name}
              </h2>

              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                {employeeRecord?.jobTitle || currentUser.jobTitle || 'Employee'}
              </p>

              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  roleBadgeStyles[employeeRecord?.role || currentUser.role] ||
                  'border-slate-300 bg-slate-100 text-slate-600'
                }`}
              >
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {employeeRecord?.role || currentUser.role}
                </span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-[#111624]">
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                Identity Summary
              </h3>

              <div className="space-y-4">
                <InfoRow icon={<Hash size={16} className="text-red-600" />} label="Employee Number" value={employeeRecord?.employeeNumber || currentUser.employeeNumber || 'â€”'} />
                <InfoRow icon={<Mail size={16} className="text-red-600" />} label="Email" value={employeeRecord?.email || currentUser.email || 'â€”'} />
                <InfoRow icon={<Building2 size={16} className="text-red-600" />} label="Department" value={employeeRecord?.department || currentUser.department || 'â€”'} />
                <InfoRow icon={<Phone size={16} className="text-red-600" />} label="Phone" value={employeeRecord?.phone || currentUser.phone || 'Not provided'} />
                <InfoRow icon={<Briefcase size={16} className="text-red-600" />} label="Job Title" value={employeeRecord?.jobTitle || currentUser.jobTitle || 'Not provided'} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard title="Assigned Assets" value={assignedAssets.length} />
              <StatCard title="Requests Submitted" value={sortedRequests.length} />
              <StatCard title="Tickets Submitted" value={sortedTickets.length} />
            </div>

            <SectionCard title="Assigned Assets" icon={<Package size={16} className="text-red-600" />}>
              {assignedAssets.length > 0 ? (
                <div className="space-y-3">
                  {assignedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {asset.name}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {asset.tag} {asset.manufacturer ? `â€¢ ${asset.manufacturer}` : ''}
                          </p>
                        </div>
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-blue-500">
                          {asset.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyNote text="No assets currently assigned." />
              )}
            </SectionCard>

            <SectionCard title="Submitted Requests" icon={<Send size={16} className="text-red-600" />}>
              {sortedRequests.length > 0 ? (
                <div className="space-y-3">
                  {sortedRequests.slice(0, 6).map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {request.requestNumber || 'Request'}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {request.dateSubmitted || 'No date'}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-widest',
                            requestStatusStyle(request.status),
                          )}
                        >
                          {request.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyNote text="No requests submitted yet." />
              )}
            </SectionCard>

            <SectionCard title="Submitted Maintenance Tickets" icon={<Wrench size={16} className="text-red-600" />}>
              {sortedTickets.length > 0 ? (
                <div className="space-y-3">
                  {sortedTickets.slice(0, 6).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {ticket.title}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {ticket.category} â€¢ {new Date(ticket.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-widest',
                            ticketStatusStyle(ticket.status),
                          )}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyNote text="No maintenance tickets submitted yet." />
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      {isEditOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-slate-800 bg-[#0f121d] shadow-[0_0_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-slate-800/50 bg-[#161b29]/40 p-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">
                  Edit <span className="text-red-600">Profile</span>
                </h2>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                  Avatar, contact details, and identity update workspace
                </p>
              </div>

              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-500 transition-all hover:text-white"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-8">
              <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                <div className="rounded-[2rem] border border-slate-800 bg-[#111624] p-6">
                  <div className="mx-auto mb-5 h-32 w-32 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900">
                    <img
                      src={
                        formData.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || currentUser.name)}&background=0f172a&color=38bdf8&size=256`
                      }
                      alt={formData.name || currentUser.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Upload Profile Picture
                  </label>

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-red-600">
                    <Upload size={14} />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                      }}
                    />
                  </label>

                  <div className="mt-4 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Or Paste Image URL / Data URL
                    </label>
                    <textarea
                      value={formData.avatar}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, avatar: event.target.value }))
                      }
                      className="min-h-[110px] w-full resize-none rounded-2xl border border-slate-800 bg-[#05070a] p-3 text-[10px] text-white outline-none transition-all focus:border-red-600"
                      placeholder="Paste image URL or base64 data URL here..."
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <ProfileField
                      label="Full Name"
                      value={formData.name}
                      onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                      required
                    />
                    <ProfileField
                      label="Email"
                      value={formData.email}
                      onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
                      type="email"
                      required
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <ReadOnlyField label="Employee Number" value={formData.employeeNumber || 'â€”'} />
                    <ReadOnlyField label="Department" value={formData.department || 'â€”'} />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <ReadOnlyField label="Access Level" value={formData.role || 'â€”'} />
                    <ProfileField
                      label="Phone"
                      value={formData.phone}
                      onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
                      placeholder="e.g. 0917-123-4567"
                    />
                  </div>

                  <ReadOnlyField label="Job Title" value={formData.jobTitle || 'Not provided'} />

                  <ProfileField
                    label="Password"
                    value={formData.password}
                    onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
                    type="password"
                    placeholder="Leave blank to keep your current password"
                  />

                  <div className="rounded-2xl border border-blue-900/30 bg-blue-500/10 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                      Identity Restrictions
                    </p>
                    <p className="mt-2 text-xs leading-6 text-blue-200/90">
                      Department and Job Title are controlled by the company directory and cannot be changed from this page.
                    </p>
                  </div>
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                    {errorMessage}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-4 pt-4 md:flex-row">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-800 bg-transparent px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:bg-slate-900 italic"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-red-600 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-red-950/40 transition-all hover:bg-red-700 active:scale-95 italic disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} strokeWidth={3} />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-[#111624]">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-[#111624]">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">
      {text}
    </p>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300">{value}</p>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <input
        required={required}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-800 bg-[#05070a] p-4 text-sm text-white outline-none transition-all focus:border-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
        {value}
      </div>
    </div>
  );
}

export default Profile;



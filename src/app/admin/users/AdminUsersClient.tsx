'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import {
  ALL_PERMISSIONS,
  PERMISSION_PRESETS,
  PermissionId,
  parseUserPermissions,
} from '@/lib/permissions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faUserShield,
  faUserGear,
  faUser,
  faKey,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
  faShoppingBag,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faEye,
  faTimes,
  faCheck,
  faSpinner,
  faUserSecret,
  faCalendarAlt,
  faDollarSign,
  faLock,
  faShieldHalved,
  faWandMagicSparkles,
  faCheckDouble,
  faBan,
  faBoxes,
  faClipboardList,
  faTag,
  faTicket,
  faStar,
  faRotateLeft,
  faGift,
  faSliders,
  faDatabase,
  faChartBar,
} from '@fortawesome/free-solid-svg-icons';

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  permissions: string;
  createdAt: string;
  updatedAt: string;
  ordersCount: number;
  totalSpent: number;
  orders: any[];
}

interface GuestBuyer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: any[];
}

export default function AdminUsersClient() {
  const { data: session } = useSession();
  const { language, currency } = useSettings();
  const t = translations[language].adminUsers;

  const currentUserId = (session?.user as any)?.id;
  const currentRole = (session?.user as any)?.role;

  const [loading, setLoading] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [guestBuyers, setGuestBuyers] = useState<GuestBuyer[]>([]);
  const [activeTab, setActiveTab] = useState<'registered' | 'guests'>('registered');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'MODERATOR' | 'ADMIN'>('ALL');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');
  const [editPermissions, setEditPermissions] = useState<PermissionId[]>([]);
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState<RegisteredUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Guest Details Modal State
  const [selectedGuest, setSelectedGuest] = useState<GuestBuyer | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await res.json();
      setRegisteredUsers(data.registeredUsers || []);
      setGuestBuyers(data.guestBuyers || []);
    } catch (err: any) {
      showToast('error', err.message || t.errorUpdate);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Filter Registered Users
  const filteredRegisteredUsers = registeredUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filter Guest Buyers
  const filteredGuestBuyers = guestBuyers.filter((guest) => {
    return (
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Stats
  const totalAdminsAndMods = registeredUsers.filter((u) => u.role === 'ADMIN' || u.role === 'MODERATOR').length;
  const totalCustomerSpend =
    registeredUsers.reduce((sum, u) => sum + u.totalSpent, 0) +
    guestBuyers.reduce((sum, g) => sum + g.totalSpent, 0);

  const getPermissionIcon = (id: PermissionId) => {
    switch (id) {
      case 'manage_dashboard': return faChartBar;
      case 'manage_orders': return faClipboardList;
      case 'manage_products': return faBoxes;
      case 'manage_categories': return faTag;
      case 'manage_users': return faUsers;
      case 'manage_promocodes': return faTicket;
      case 'manage_reviews': return faStar;
      case 'manage_returns': return faRotateLeft;
      case 'manage_referrals': return faGift;
      case 'manage_settings': return faSliders;
      case 'manage_backup': return faDatabase;
      default: return faShieldHalved;
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: RegisteredUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPermissions(parseUserPermissions(user.permissions));
    setEditPassword('');
    setShowPassword(false);
  };

  const handleTogglePermission = (id: PermissionId) => {
    setEditPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PERMISSION_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setEditPermissions([...preset.permissions]);
    }
  };

  // Submit Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSavingEdit(true);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editName,
          role: editRole,
          permissions: editRole === 'MODERATOR' ? editPermissions : [],
          password: editPassword.trim() !== '' ? editPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.errorUpdate);
      }

      showToast('success', t.successUpdate);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || t.errorUpdate);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUserId) {
      showToast('error', t.cannotDeleteSelf);
      setDeletingUser(null);
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingUser.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      showToast('success', t.deletedSuccess);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadge = (user: RegisteredUser) => {
    switch (user.role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
            <FontAwesomeIcon icon={faUserShield} className="text-xs" />
            <span>{t.roleAdmin}</span>
          </span>
        );
      case 'MODERATOR': {
        const perms = parseUserPermissions(user.permissions);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
              <FontAwesomeIcon icon={faUserGear} className="text-xs" />
              <span>{t.roleModerator}</span>
            </span>
            <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-md border theme-border">
              {perms.length === ALL_PERMISSIONS.length
                ? (language === 'ar' ? 'جميع الصلاحيات' : 'Full Access')
                : `${perms.length}/${ALL_PERMISSIONS.length} ${t.permissionsCount}`}
            </span>
          </div>
        );
      }
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <FontAwesomeIcon icon={faUser} className="text-xs" />
            <span>{t.roleUser}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 end-5 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 text-xs font-extrabold animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          <FontAwesomeIcon icon={toast.type === 'success' ? faCheck : faTimes} className="text-base" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2.5">
            <FontAwesomeIcon icon={faUsers} className="text-indigo-600 dark:text-indigo-400" />
            <span>{t.title}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border theme-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)]">{t.totalUsers}</p>
            <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{registeredUsers.length}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border theme-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xl">
            <FontAwesomeIcon icon={faUserShield} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)]">{t.adminsAndMods}</p>
            <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{totalAdminsAndMods}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border theme-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xl">
            <FontAwesomeIcon icon={faUserSecret} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)]">{t.totalGuests}</p>
            <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{guestBuyers.length}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border theme-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl">
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)]">{t.customerSpend}</p>
            <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{formatPrice(totalCustomerSpend, currency, language)}</p>
          </div>
        </div>
      </div>

      {/* Tabs & Toolbar */}
      <div className="glass-panel rounded-2xl border theme-border overflow-hidden">
        {/* Tab Buttons Header */}
        <div className="border-b theme-border bg-[var(--bg-surface)] p-2 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('registered')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'registered'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <FontAwesomeIcon icon={faUser} />
            <span>{t.tabRegistered}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'registered' ? 'bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {registeredUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('guests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'guests'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <FontAwesomeIcon icon={faUserSecret} />
            <span>{t.tabGuests}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'guests' ? 'bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {guestBuyers.length}
            </span>
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="p-4 border-b theme-border flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'registered' ? t.searchRegistered : t.searchGuests}
              className="w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          {activeTab === 'registered' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <FontAwesomeIcon icon={faFilter} className="text-xs text-[var(--text-muted)]" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold"
              >
                <option value="ALL">{t.allRoles}</option>
                <option value="USER">{t.roleUser}</option>
                <option value="MODERATOR">{t.roleModerator}</option>
                <option value="ADMIN">{t.roleAdmin}</option>
              </select>
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-3">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-indigo-600" />
            <span>{t.loadingData}</span>
          </div>
        ) : activeTab === 'registered' ? (
          /* REGISTERED USERS */
          filteredRegisteredUsers.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)]">{t.noUsers}</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y theme-border">
                {filteredRegisteredUsers.map((user) => (
                  <div key={user.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-[var(--text-primary)]">{user.name}</span>
                        {user.id === currentUserId && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded">{t.you}</span>}
                        {getRoleBadge(user)}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{formatPrice(user.totalSpent, currency, language)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleOpenEdit(user)} className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 border border-indigo-200 dark:border-indigo-700/50 transition"><FontAwesomeIcon icon={faEdit} /></button>
                      {currentRole === 'ADMIN' && user.id !== currentUserId && (
                        <button onClick={() => setDeletingUser(user)} className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-600 border border-rose-200 dark:border-rose-800/50 transition"><FontAwesomeIcon icon={faTrash} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b theme-border bg-[var(--bg-surface)] text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                      <th className="text-start px-5 py-3.5">{t.user}</th>
                      <th className="text-start px-5 py-3.5">{t.role}</th>
                      <th className="text-start px-5 py-3.5">{t.ordersCount}</th>
                      <th className="text-start px-5 py-3.5">{t.totalSpent}</th>
                      <th className="text-start px-5 py-3.5">{t.joinedDate}</th>
                      <th className="text-end px-5 py-3.5">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {filteredRegisteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-[var(--bg-card)] transition">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.id === currentUserId && (
                                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {t.you}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">{getRoleBadge(user)}</td>
                        <td className="px-5 py-4 font-bold text-[var(--text-primary)]">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border theme-border">
                            <FontAwesomeIcon icon={faShoppingBag} className="text-indigo-500" />
                            <span>{user.ordersCount} {t.itemsCount}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 font-black text-emerald-600 dark:text-emerald-400">{formatPrice(user.totalSpent, currency, language)}</td>
                        <td className="px-5 py-4 text-[var(--text-secondary)] font-medium">
                          <div className="flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px] text-[var(--text-muted)]" />
                            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenEdit(user)} className="px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition text-xs font-bold flex items-center gap-1.5 shadow-sm" title={t.editUser}>
                              <FontAwesomeIcon icon={faEdit} />
                              <span>{t.editUser}</span>
                            </button>
                            {currentRole === 'ADMIN' && user.id !== currentUserId && (
                              <button onClick={() => setDeletingUser(user)} className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition text-xs shadow-sm" title={t.deleteUser}>
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          /* GUEST BUYERS TABLE */
          filteredGuestBuyers.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)]">{t.noGuests}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b theme-border bg-[var(--bg-surface)] text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                    <th className="text-start px-5 py-3.5">{t.guestName}</th>
                    <th className="text-start px-5 py-3.5">{t.phone}</th>
                    <th className="text-start px-5 py-3.5">{t.address}</th>
                    <th className="text-start px-5 py-3.5">{t.ordersCount}</th>
                    <th className="text-start px-5 py-3.5">{t.totalSpent}</th>
                    <th className="text-start px-5 py-3.5">{t.lastOrder}</th>
                    <th className="text-end px-5 py-3.5">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredGuestBuyers.map((guest) => (
                    <tr key={guest.id} className="hover:bg-[var(--bg-card)] transition">
                      {/* Guest Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                            {guest.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-[var(--text-primary)]">{guest.name}</div>
                            {guest.email !== 'N/A' && (
                              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1 font-medium">
                                <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />
                                <span>{guest.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 font-bold text-[var(--text-primary)]">
                        <div className="flex items-center gap-1.5 dir-ltr">
                          <FontAwesomeIcon icon={faPhone} className="text-[10px] text-amber-500" />
                          <span>{guest.phone}</span>
                        </div>
                      </td>

                      {/* Shipping Address */}
                      <td className="px-5 py-4 max-w-xs text-[var(--text-secondary)] font-medium truncate" title={guest.address}>
                        <div className="flex items-center gap-1.5 truncate">
                          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px] text-rose-500 flex-shrink-0" />
                          <span className="truncate">{guest.address}</span>
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td className="px-5 py-4 font-bold text-[var(--text-primary)]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border theme-border">
                          <FontAwesomeIcon icon={faShoppingBag} className="text-amber-500" />
                          <span>
                            {guest.ordersCount} {t.itemsCount}
                          </span>
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="px-5 py-4 font-black text-emerald-600 dark:text-emerald-400">
                        {formatPrice(guest.totalSpent, currency, language)}
                      </td>

                      {/* Last Order Date */}
                      <td className="px-5 py-4 text-[var(--text-secondary)] font-medium">
                        {new Date(guest.lastOrderDate).toLocaleDateString()}
                      </td>

                      {/* View Orders Action */}
                      <td className="px-5 py-4 text-end">
                        <button
                          onClick={() => setSelectedGuest(guest)}
                          className="px-3 py-1.5 rounded-lg border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-amber-600 hover:text-white hover:border-amber-600 transition text-xs font-bold flex items-center gap-1.5 shadow-sm ms-auto"
                        >
                          <FontAwesomeIcon icon={faEye} />
                          <span>{t.viewOrders}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b theme-border flex items-center justify-between flex-shrink-0 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-base">
                  {editingUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)]">{t.editUser}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-lg border theme-border flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-extrabold text-[var(--text-secondary)] mb-1">{t.name}</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Role Selection */}
              {currentRole === 'ADMIN' && (
                <div>
                  <label className="block text-xs font-extrabold text-[var(--text-secondary)] mb-2">{t.role}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['USER', 'MODERATOR', 'ADMIN'] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setEditRole(r)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                          editRole === r
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border theme-border hover:border-indigo-400'
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={r === 'ADMIN' ? faUserShield : r === 'MODERATOR' ? faUserGear : faUser}
                          className="text-sm"
                        />
                        <span>{r === 'ADMIN' ? t.roleAdmin : r === 'MODERATOR' ? t.roleModerator : t.roleUser}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PERMISSIONS MATRIX FOR MODERATOR */}
              {editRole === 'MODERATOR' && currentRole === 'ADMIN' && (
                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border theme-border space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b theme-border">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center text-xs font-bold">
                        <FontAwesomeIcon icon={faShieldHalved} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[var(--text-primary)]">{t.permissionsTitle}</h4>
                        <p className="text-[10px] text-[var(--text-muted)]">{t.permissionsSubtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {editPermissions.length}/{ALL_PERMISSIONS.length} {t.permissionsCount}
                      </span>
                    </div>
                  </div>

                  {/* Preset quick action bar */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                      <FontAwesomeIcon icon={faWandMagicSparkles} className="text-amber-500 text-[10px]" />
                      <span>{t.applyPreset}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISSION_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.id)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--bg-surface)] border theme-border text-[var(--text-primary)] hover:border-indigo-500 hover:text-indigo-600 transition shadow-xs"
                          title={language === 'ar' ? preset.descAr : preset.descEn}
                        >
                          {language === 'ar' ? preset.nameAr : preset.nameEn}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ms-auto">
                        <button
                          type="button"
                          onClick={() => setEditPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition flex items-center gap-1"
                        >
                          <FontAwesomeIcon icon={faCheckDouble} className="text-[9px]" />
                          <span>{t.selectAll}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPermissions([])}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white transition flex items-center gap-1"
                        >
                          <FontAwesomeIcon icon={faBan} className="text-[9px]" />
                          <span>{t.clearAll}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions checkboxes grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {ALL_PERMISSIONS.map((perm) => {
                      const isChecked = editPermissions.includes(perm.id);
                      const icon = getPermissionIcon(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer select-none transition flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400/80 shadow-xs'
                              : 'bg-[var(--bg-surface)] border theme-border opacity-75 hover:opacity-100 hover:border-indigo-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center text-[10px] flex-shrink-0 transition ${
                              isChecked
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'border theme-border bg-[var(--bg-primary)]'
                            }`}
                          >
                            {isChecked && <FontAwesomeIcon icon={faCheck} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <FontAwesomeIcon
                                icon={icon}
                                className={`text-[11px] ${isChecked ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`}
                              />
                              <span className="font-extrabold text-[var(--text-primary)] text-xs truncate">
                                {language === 'ar' ? perm.nameAr : perm.nameEn}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-tight">
                              {language === 'ar' ? perm.descAr : perm.descEn}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Change Password */}
              {currentRole === 'ADMIN' && (
                <div>
                  <label className="block text-xs font-extrabold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faLock} className="text-amber-500" />
                      <span>{t.changePassword}</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t.leaveBlankPassword}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-3 py-2 pe-10 text-xs rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <FontAwesomeIcon icon={showPassword ? faTimes : faKey} />
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{t.leaveBlankPassword}</p>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border theme-border text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {savingEdit && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                  <span>{savingEdit ? t.saving : t.saveChanges}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faTrash} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">{t.deleteUser}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t.deleteConfirm}</p>
              <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-xl border border-rose-200 dark:border-rose-800">
                {deletingUser.name} ({deletingUser.email})
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl border theme-border text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-700 shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                <span>{deleting ? t.saving : t.deleteUser}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST CUSTOMER ORDERS MODAL */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b theme-border flex items-center justify-between bg-[var(--bg-surface)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-sm">
                  {selectedGuest.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <span>{selectedGuest.name}</span>
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {t.tabGuests}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selectedGuest.address}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuest(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2"
              >
                <FontAwesomeIcon icon={faTimes} className="text-base" />
              </button>
            </div>

            {/* Guest Summary Info */}
            <div className="p-4 bg-[var(--bg-primary)] border-b theme-border grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] font-bold">{t.phone}</span>
                <span className="font-extrabold text-[var(--text-primary)] dir-ltr inline-block">{selectedGuest.phone}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] font-bold">{t.email}</span>
                <span className="font-extrabold text-[var(--text-primary)] truncate block">{selectedGuest.email}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] font-bold">{t.totalSpent}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatPrice(selectedGuest.totalSpent, currency, language)}
                </span>
              </div>
            </div>

            {/* Orders List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">
                {t.guestOrdersTitle} ({selectedGuest.orders.length})
              </h4>

              {selectedGuest.orders.map((order) => (
                <div key={order.id} className="p-4 rounded-xl border theme-border bg-[var(--bg-surface)] space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b theme-border">
                    <div className="font-bold text-[var(--text-primary)]">
                      <span>#{order.id.slice(-8)}</span>
                      <span className="text-[var(--text-muted)] text-[10px] ms-2">
                        ({new Date(order.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : order.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="font-black text-[var(--text-primary)]">
                        {formatPrice(order.totalAmount, currency, language)}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.orderItems?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold flex items-center justify-center">
                            {item.quantity}x
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">{item.product?.title || 'Product'}</span>
                        </div>
                        <span className="font-bold text-[var(--text-secondary)]">
                          {formatPrice(item.price * item.quantity, currency, language)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t theme-border bg-[var(--bg-surface)] flex justify-end">
              <button
                onClick={() => setSelectedGuest(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 transition"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

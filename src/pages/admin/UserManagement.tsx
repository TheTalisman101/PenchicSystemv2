import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  UserPlus, Pencil, Trash2, Shield, Search, Filter,
  ChevronLeft, ChevronRight, Calendar, Mail,
  User as UserIcon, CheckCircle, XCircle, X,
  AlertTriangle, Users, Crown, Briefcase, ShoppingBag,
  RefreshCw, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';

// ── Types ──────────────────────────────────────────────────────────────────────
type Role   = 'admin' | 'worker' | 'customer';
type Status = 'active' | 'inactive' | 'suspended';

interface UserProfile {
  id: string;
  email: string;
  role: Role;
  status: Status;
  created_at: string;
  last_login?: string;
  orders?: [{ count: number }];
}
interface Toast { message: string; type: 'success' | 'error' }

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_CFG: Record<Role, { label: string; cls: string; Icon: React.FC<any> }> = {
  admin:    { label: 'Admin',    cls: 'bg-violet-50  text-violet-700  ring-1 ring-violet-200/60',  Icon: Crown      },
  worker:   { label: 'Worker',   cls: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200/60',     Icon: Briefcase  },
  customer: { label: 'Customer', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', Icon: ShoppingBag},
};
const ROLE_DESC: Record<Role, string> = {
  admin:    'Full system access and user management',
  worker:   'POS access and inventory management',
  customer: 'Shopping and order management only',
};

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
];
const avatarCls  = (email: string) => AVATAR_COLORS[email.charCodeAt(0) % AVATAR_COLORS.length];
const getInitial = (email: string) => email.charAt(0).toUpperCase();
const fmtDate    = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });

// ── Skeletons ──────────────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
    <div className="w-9 h-9 bg-neutral-200 rounded-xl mb-3" />
    <div className="w-10 h-7 bg-neutral-200 rounded-lg mb-1.5" />
    <div className="w-20 h-3 bg-neutral-100 rounded-full" />
  </div>
);
const RowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-neutral-200 rounded-full flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="w-44 h-3.5 bg-neutral-200 rounded-full" />
          <div className="w-24 h-2.5 bg-neutral-100 rounded-full" />
        </div>
      </div>
    </td>
    <td className="px-5 py-4"><div className="w-24 h-6 bg-neutral-100 rounded-full" /></td>
    <td className="px-5 py-4"><div className="w-24 h-3 bg-neutral-100 rounded-full" /></td>
    <td className="px-5 py-4"><div className="w-8 h-6 bg-neutral-100 rounded-full" /></td>
    <td className="px-5 py-4">
      <div className="flex justify-end gap-2">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="w-7 h-7 bg-neutral-100 rounded-lg" />)}
      </div>
    </td>
  </tr>
);

// ── Form helpers ───────────────────────────────────────────────────────────────
const inputCls = (err?: string) =>
  `w-full px-3.5 py-2.5 border rounded-xl text-sm text-neutral-800 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] transition-all ${
    err ? 'border-red-300 bg-red-50/30' : 'border-neutral-200 focus:border-neutral-300'
  }`;
const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="text-[11px] text-red-500 mt-1 font-medium">{msg}</p> : null;

// ── Main Component ─────────────────────────────────────────────────────────────
const UserManagement = () => {
  const [users,           setUsers]           = useState<UserProfile[]>([]);
  const [loadingUsers,    setLoadingUsers]    = useState(true);
  const [submitting,      setSubmitting]      = useState(false);
  // Tracks which specific row is being updated inline — no full-page spinner
  const [updatingUserId,  setUpdatingUserId]  = useState<string | null>(null);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [roleFilter,      setRoleFilter]      = useState<'all' | Role>('all');
  const [currentPage,     setCurrentPage]     = useState(1);
  const [usersPerPage]                        = useState(10);
  // Sort is passed directly into fetchUsers to avoid stale-state bug
  const [sortBy,          setSortBy]          = useState('created_at');
  const [sortOrder,       setSortOrder]       = useState<'asc' | 'desc'>('desc');
  const [expandedUserId,  setExpandedUserId]  = useState<string | null>(null);
  const [editingUser,     setEditingUser]     = useState<UserProfile | null>(null);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkMode,        setBulkMode]        = useState(false);
  const [selectedUsers,   setSelectedUsers]   = useState<string[]>([]);
  const [toast,           setToast]           = useState<Toast | null>(null);
  const [showPerms,       setShowPerms]       = useState(false);
  const [editForm,        setEditForm]        = useState({ email: '', role: 'customer' as Role, status: 'active' as Status });
  const [addForm,         setAddForm]         = useState({ email: '', password: '', role: 'customer' as Role });
  const [addErrors,       setAddErrors]       = useState<Record<string, string>>({});

  useEffect(() => { fetchUsers(); }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  // ── fetchUsers — sort params passed directly to avoid async stale-state [web:135] ──
  const fetchUsers = async (field = sortBy, direction = sortOrder) => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, orders(count), created_at')
        .order(field, { ascending: direction === 'asc' });
      if (error) throw error;
      setUsers((data ?? []).map(u => ({
        ...u,
        status:     u.status     ?? 'active',
        last_login: u.last_login ?? u.created_at,
      })));
    } catch (err) {
      console.error(err);
      showToast('Failed to load users', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
    fetchUsers(field, newOrder); // ✅ pass directly — no stale state
  };

  // ── Optimistic role update — no confirm() [web:124] ───────────────────────
  const handleUpdateRole = async (userId: string, newRole: string) => {
    const prev = users.find(u => u.id === userId)?.role;
    setUsers(p => p.map(u => u.id === userId ? { ...u, role: newRole as Role } : u));
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      showToast(`Role changed to ${newRole}`, 'success');
    } catch (err: any) {
      // Revert on failure
      setUsers(p => p.map(u => u.id === userId ? { ...u, role: prev! } : u));
      showToast(err.message ?? 'Failed to update role', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ── Optimistic status toggle — no alert() ────────────────────────────────
  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setUsers(p => p.map(u => u.id === userId ? { ...u, status: newStatus as Status } : u));
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
      if (error) throw error;
      showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    } catch (err: any) {
      setUsers(p => p.map(u => u.id === userId ? { ...u, status: currentStatus as Status } : u));
      showToast(err.message ?? 'Failed to update status', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ── Delete — no confirm(), uses custom dialog ─────────────────────────────
  const handleDeleteUser = async (userId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers(p => p.filter(u => u.id !== userId));
      setDeleteConfirmId(null);
      showToast('User deleted successfully', 'success');
    } catch (err: any) {
      showToast(err.message ?? 'Failed to delete user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Add user ───────────────────────────────────────────────────────────────
  const validateAdd = (): boolean => {
    const e: Record<string, string> = {};
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!addForm.email)               e.email    = 'Email is required';
    else if (!re.test(addForm.email)) e.email    = 'Enter a valid email address';
    if (!addForm.password)            e.password = 'Password is required';
    else if (addForm.password.length < 6) e.password = 'Minimum 6 characters';
    setAddErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAdd()) return;
    setSubmitting(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: addForm.email, password: addForm.password,
      });
      if (authErr) throw authErr;
      if (authData.user) {
        const { error: profileErr } = await supabase.from('profiles').insert([{
          id: authData.user.id, email: addForm.email, role: addForm.role,
        }]);
        if (profileErr) throw profileErr;
      }
      setAddForm({ email: '', password: '', role: 'customer' });
      setAddErrors({});
      setShowAddModal(false);
      fetchUsers();
      showToast('User created successfully', 'success');
    } catch (err: any) {
      showToast(err.message ?? 'Failed to create user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit user ──────────────────────────────────────────────────────────────
  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setEditForm({ email: u.email, role: u.role, status: u.status ?? 'active' });
    setShowPerms(false);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ email: editForm.email, role: editForm.role, status: editForm.status })
        .eq('id', editingUser.id);
      if (error) throw error;
      // Optimistic local update
      setUsers(p => p.map(u =>
        u.id === editingUser.id
          ? { ...u, email: editForm.email, role: editForm.role, status: editForm.status }
          : u
      ));
      setShowEditModal(false);
      setEditingUser(null);
      showToast('User updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message ?? 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkStatus = async (newStatus: string) => {
    if (!selectedUsers.length) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ status: newStatus }).in('id', selectedUsers);
      if (error) throw error;
      setUsers(p => p.map(u =>
        selectedUsers.includes(u.id) ? { ...u, status: newStatus as Status } : u
      ));
      showToast(`${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
      setSelectedUsers([]);
    } catch (err: any) {
      showToast(err.message ?? 'Failed to update users', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedUsers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (roleFilter === 'all' || u.role === roleFilter)
  );
  const totalPages   = Math.ceil(filteredUsers.length / usersPerPage);
  const startIdx     = (currentPage - 1) * usersPerPage;
  const currentUsers = filteredUsers.slice(startIdx, startIdx + usersPerPage);

  const adminCount    = users.filter(u => u.role === 'admin').length;
  const workerCount   = users.filter(u => u.role === 'worker').length;
  const customerCount = users.filter(u => u.role === 'customer').length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="User Management" subtitle="Manage system users and permissions">
      <div className="space-y-6">

        {/* ── Stat cards ────────────────────────────────────────────────────── */}
        {loadingUsers ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { icon: Users,       label: 'Total Users', value: users.length,   bg: 'bg-sky-50',     ic: 'text-sky-500'     },
              { icon: Crown,       label: 'Admins',      value: adminCount,     bg: 'bg-violet-50',  ic: 'text-violet-500'  },
              { icon: Briefcase,   label: 'Workers',     value: workerCount,    bg: 'bg-sky-50',     ic: 'text-sky-500'     },
              { icon: ShoppingBag, label: 'Customers',   value: customerCount,  bg: 'bg-emerald-50', ic: 'text-emerald-500' },
            ] as const).map(({ icon: Icon, label, value, bg, ic }) => (
              <div key={label} className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-neutral-300 transition-all">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${ic}`} />
                </div>
                <p className="text-2xl font-bold text-neutral-900 tabular-nums">{value}</p>
                <p className="text-xs text-neutral-400 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Toolbar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text" placeholder="Search by email…" value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 shadow-sm">
              <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <select
                value={roleFilter}
                onChange={e => { setRoleFilter(e.target.value as 'all' | Role); setCurrentPage(1); }}
                className="text-sm font-medium text-neutral-700 bg-transparent border-none outline-none py-2.5 pr-1 cursor-pointer"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="worker">Worker</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <button
              onClick={() => { setBulkMode(!bulkMode); setSelectedUsers([]); }}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                bulkMode ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Bulk
            </button>
          </div>

          <button
            onClick={() => { setAddErrors({}); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* ── Bulk actions banner ───────────────────────────────────────────── */}
        <AnimatePresence>
          {bulkMode && selectedUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between bg-neutral-900 text-white rounded-xl px-5 py-3"
            >
              <p className="text-sm font-medium">
                <span className="font-bold">{selectedUsers.length}</span> selected
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleBulkStatus('active')} disabled={submitting}
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50">
                  Activate
                </button>
                <button onClick={() => handleBulkStatus('inactive')} disabled={submitting}
                  className="text-xs font-semibold px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50">
                  Deactivate
                </button>
                <button onClick={() => setSelectedUsers([])}
                  className="text-xs font-medium px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results meta */}
        {!loadingUsers && (
          <p className="text-xs text-neutral-400 font-medium -mt-2">
            <span className="text-neutral-700 font-semibold">{filteredUsers.length}</span>
            {' '}of {users.length} user{users.length !== 1 ? 's' : ''}
            {roleFilter !== 'all' && <> · <span className="capitalize">{roleFilter}s</span></>}
          </p>
        )}

        {/* ── Users table ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50/80 border-b border-neutral-200">
                <tr>
                  {bulkMode && (
                    <th className="pl-5 py-3.5 w-10">
                      <input type="checkbox"
                        checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                        onChange={e => setSelectedUsers(e.target.checked ? currentUsers.map(u => u.id) : [])}
                        className="rounded border-neutral-300 focus:ring-neutral-500"
                      />
                    </th>
                  )}
                  {[
                    { label: 'User',   field: 'email',      Icon: Mail     },
                    { label: 'Role',   field: 'role',       Icon: Shield   },
                    { label: 'Joined', field: 'created_at', Icon: Calendar },
                    { label: 'Orders', field: null,         Icon: null     },
                  ].map(({ label, field, Icon }) => (
                    <th key={label} className="text-left px-5 py-3.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      {field ? (
                        <button onClick={() => handleSort(field)}
                          className="flex items-center gap-1.5 hover:text-neutral-700 transition-colors">
                          {Icon && <Icon className="w-3.5 h-3.5" />}
                          {label}
                          {sortBy === field && <span className="text-neutral-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                      ) : label}
                    </th>
                  ))}
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {loadingUsers
                  ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                  : currentUsers.map((user, idx) => {
                    const { cls: roleCls, Icon: RoleIcon } = ROLE_CFG[user.role] ?? ROLE_CFG.customer;
                    const isUpdating = updatingUserId === user.id;
                    const isExpanded = expandedUserId === user.id;

                    return (
                      <React.Fragment key={user.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.04, 0.28) }}
                          className={`transition-colors ${isExpanded ? 'bg-neutral-50/60' : 'hover:bg-neutral-50/40'}`}
                        >
                          {bulkMode && (
                            <td className="pl-5 py-4">
                              <input type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => toggleSelect(user.id)}
                                className="rounded border-neutral-300 focus:ring-neutral-500"
                              />
                            </td>
                          )}

                          {/* User */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarCls(user.email)}`}>
                                {getInitial(user.email)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900 truncate max-w-[200px]">{user.email}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] text-neutral-400 font-mono">{user.id.slice(0, 8)}…</p>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                    user.status === 'active' ? 'text-emerald-600' : 'text-red-500'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role — inline select for instant changes, optimistic + toast */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${roleCls}`}>
                                <RoleIcon className="w-3 h-3" />
                                {ROLE_CFG[user.role]?.label ?? user.role}
                              </span>
                              <select
                                value={user.role}
                                onChange={e => handleUpdateRole(user.id, e.target.value)}
                                disabled={isUpdating}
                                title="Change role"
                                className="text-[11px] text-neutral-400 bg-transparent border-none outline-none cursor-pointer hover:text-neutral-700 transition-colors disabled:opacity-40"
                              >
                                <option value="customer">Customer</option>
                                <option value="worker">Worker</option>
                                <option value="admin">Admin</option>
                              </select>
                              {isUpdating && <RefreshCw className="w-3 h-3 text-neutral-400 animate-spin flex-shrink-0" />}
                            </div>
                          </td>

                          {/* Joined */}
                          <td className="px-5 py-4">
                            <p className="text-xs font-medium text-neutral-700">{fmtDate(user.created_at)}</p>
                          </td>

                          {/* Orders */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-neutral-100 text-neutral-600 rounded-full text-xs font-semibold tabular-nums">
                              {user.orders?.[0]?.count ?? 0}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditModal(user)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleStatusToggle(user.id, user.status)} disabled={isUpdating}
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                                  user.status === 'active'
                                    ? 'text-neutral-400 hover:text-red-500 hover:bg-red-50'
                                    : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                              >
                                {user.status === 'active'
                                  ? <XCircle className="w-3.5 h-3.5" />
                                  : <CheckCircle className="w-3.5 h-3.5" />
                                }
                              </button>
                              <button onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors" title="Details">
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                              <button onClick={() => setDeleteConfirmId(user.id)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>

                        {/* Inline expanded detail row */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.tr
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              transition={{ duration: 0.16 }}
                            >
                              <td colSpan={bulkMode ? 6 : 5} className="bg-neutral-50/60 border-b border-neutral-100 px-5 py-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                  <div>
                                    <p className="text-neutral-400 font-medium mb-0.5">Full ID</p>
                                    <p className="font-mono text-neutral-600 break-all text-[10px]">{user.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-neutral-400 font-medium mb-0.5">Last Login</p>
                                    <p className="text-neutral-700 font-medium">{user.last_login ? fmtDate(user.last_login) : 'Never'}</p>
                                  </div>
                                  <div>
                                    <p className="text-neutral-400 font-medium mb-0.5">Account Status</p>
                                    <p className={`font-semibold capitalize ${user.status === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {user.status}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                }
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loadingUsers && currentUsers.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-700">No users found</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {searchTerm || roleFilter !== 'all' ? 'Try adjusting your search or filters' : 'No users yet'}
                </p>
              </div>
              {!searchTerm && roleFilter === 'all' && (
                <button onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors">
                  <UserPlus className="w-4 h-4" /> Add First User
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100 bg-neutral-50/50">
              <p className="text-xs text-neutral-500">
                {startIdx + 1}–{Math.min(startIdx + usersPerPage, filteredUsers.length)} of {filteredUsers.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  className="p-1.5 border border-neutral-200 rounded-lg bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(pg => (
                  <button key={pg} onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === pg
                        ? 'bg-neutral-900 text-white'
                        : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >{pg}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  className="p-1.5 border border-neutral-200 rounded-lg bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation dialog ─────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 text-center">Delete User?</h3>
              <p className="text-sm text-neutral-500 text-center mt-1.5 mb-6">
                This permanently removes the account and all associated data.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={() => handleDeleteUser(deleteConfirmId!)} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {submitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add user modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">Add New User</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Create a new system account</p>
                </div>
                <button onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input type="email" value={addForm.email} placeholder="user@example.com"
                    onChange={e => { setAddForm(f => ({ ...f, email: e.target.value })); setAddErrors(p => ({ ...p, email: '' })); }}
                    className={inputCls(addErrors.email)} />
                  <FieldError msg={addErrors.email} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input type="password" value={addForm.password} placeholder="Minimum 6 characters"
                    onChange={e => { setAddForm(f => ({ ...f, password: e.target.value })); setAddErrors(p => ({ ...p, password: '' })); }}
                    className={inputCls(addErrors.password)} />
                  <FieldError msg={addErrors.password} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['customer', 'worker', 'admin'] as Role[]).map(role => {
                      const { label, Icon } = ROLE_CFG[role];
                      return (
                        <button key={role} type="button" onClick={() => setAddForm(f => ({ ...f, role }))}
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                            addForm.role === role
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                          }`}>
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5">{ROLE_DESC[addForm.role]}</p>
                </div>
                <div className="flex gap-3 pt-3 border-t border-neutral-100">
                  <button type="button" onClick={() => setShowAddModal(false)} disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                    {submitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating…</> : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit user modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-sm border-b border-neutral-100 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  {editingUser && (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarCls(editingUser.email)}`}>
                      {getInitial(editingUser.email)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">Edit User</h2>
                    <p className="text-xs text-neutral-400 truncate max-w-[180px]">{editingUser?.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Email</label>
                  <input type="email" value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className={inputCls()} required />
                </div>

                {/* Visual role picker — the key UI for role changes */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['customer', 'worker', 'admin'] as Role[]).map(role => {
                      const { label, Icon } = ROLE_CFG[role];
                      const selected = editForm.role === role;
                      return (
                        <button key={role} type="button" onClick={() => setEditForm(f => ({ ...f, role }))}
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                            selected
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                          }`}>
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5">{ROLE_DESC[editForm.role]}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Account Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Status }))}
                    className={inputCls()}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Permissions accordion */}
                {editForm.role !== 'customer' && (
                  <div className="border-t border-neutral-100 pt-4">
                    <button type="button" onClick={() => setShowPerms(!showPerms)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors">
                      <span>Permissions overview</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${showPerms ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showPerms && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="overflow-hidden mt-3 space-y-1.5 pl-1"
                        >
                          {(editForm.role === 'admin' ? [
                            'Full system access and configuration',
                            'User management and role assignment',
                            'Product catalog management',
                            'Order processing and fulfillment',
                            'Analytics and reporting access',
                            'POS system operation',
                          ] : [
                            'POS system operation',
                            'Inventory management',
                            'Order processing and stock updates',
                            'Basic reporting access',
                          ]).map(p => (
                            <li key={p} className="flex items-center gap-2 text-xs text-neutral-500">
                              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              {p}
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="flex gap-3 pt-3 border-t border-neutral-100">
                  <button type="button" onClick={() => setShowEditModal(false)} disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                    {submitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spring toast ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-lg shadow-neutral-900/10 border ${
              toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-500   flex-shrink-0" />
            }
            <span className={`text-sm font-medium max-w-xs ${toast.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
              {toast.message}
            </span>
            <button onClick={() => setToast(null)} className="ml-1 text-neutral-400 hover:text-neutral-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default UserManagement;

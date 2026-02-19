import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Plus, Pencil, Trash2, Search, Calendar, Percent, DollarSign,
  Tag, AlertCircle, CheckCircle, X, Clock, Package, RefreshCw,
  ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Product {
  id: string; name: string; price: number; stock: number; category: string;
}
interface Discount {
  id: string; product_id: string; percentage: number;
  start_date: string; end_date: string; created_by?: string; created_at: string;
  products?: { name: string; price: number; image_url: string };
}
interface FormData {
  product_id: string; percentage: string; start_date: string; end_date: string;
}
interface Toast { message: string; type: 'success' | 'error' }
type StatusFilter = 'all' | 'active' | 'scheduled' | 'expired';

// ── Pure helpers ───────────────────────────────────────────────────────────────
const getDiscountStatus = (d: Discount): 'active' | 'scheduled' | 'expired' => {
  const now = Date.now();
  if (now < new Date(d.start_date).getTime()) return 'scheduled';
  if (now > new Date(d.end_date).getTime())   return 'expired';
  return 'active';
};

const daysInfo = (d: Discount): string => {
  const now    = Date.now();
  const start  = new Date(d.start_date).getTime();
  const end    = new Date(d.end_date).getTime();
  const status = getDiscountStatus(d);
  if (status === 'scheduled') return `Starts in ${Math.ceil((start - now) / 86_400_000)}d`;
  if (status === 'active')    return `${Math.ceil((end - now) / 86_400_000)}d remaining`;
  return `Ended ${Math.floor((now - end) / 86_400_000)}d ago`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtLong = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:    { label: 'Active',    dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', Icon: CheckCircle },
  scheduled: { label: 'Scheduled', dot: 'bg-sky-400',     cls: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200/60',     Icon: Clock       },
  expired:   { label: 'Expired',   dot: 'bg-neutral-300', cls: 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200',   Icon: X           },
} as const;

// ── Skeletons ──────────────────────────────────────────────────────────────────
const DiscountSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 animate-pulse flex items-center gap-3 sm:gap-4">
    <div className="w-11 h-11 sm:w-14 sm:h-14 bg-neutral-200 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-1.5 sm:space-y-2">
      <div className="w-40 sm:w-48 h-3.5 sm:h-4 bg-neutral-200 rounded-full" />
      <div className="w-28 sm:w-32 h-2.5 sm:h-3 bg-neutral-100 rounded-full" />
      <div className="w-44 sm:w-56 h-2.5 sm:h-3 bg-neutral-100 rounded-full" />
    </div>
    <div className="w-16 sm:w-20 h-5 sm:h-6 bg-neutral-100 rounded-full hidden sm:block" />
  </div>
);

const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-4 animate-pulse">
    <div className="w-7 h-7 sm:w-9 sm:h-9 bg-neutral-200 rounded-xl mb-2.5 sm:mb-3" />
    <div className="w-10 sm:w-12 h-5 sm:h-7 bg-neutral-200 rounded-lg mb-1" />
    <div className="w-16 sm:w-20 h-2.5 sm:h-3 bg-neutral-100 rounded-full" />
  </div>
);

// ── Field error ────────────────────────────────────────────────────────────────
const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="text-[11px] text-red-500 mt-1 font-medium">{msg}</p> : null;

const inputCls = (err?: string) =>
  `w-full px-3 sm:px-3.5 py-2 sm:py-2.5 border rounded-xl text-sm text-neutral-800 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] transition-all ${
    err ? 'border-red-300 bg-red-50/30' : 'border-neutral-200 focus:border-neutral-300'
  }`;

// ── Main component ─────────────────────────────────────────────────────────────
const DiscountsOffers = () => {
  const navigate = useNavigate();
  const user     = useStore((s) => s.user);

  const [discounts,        setDiscounts]        = useState<Discount[]>([]);
  const [products,         setProducts]         = useState<Product[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);
  const [submitting,       setSubmitting]       = useState(false);
  const [showForm,         setShowForm]         = useState(false);
  const [editingDiscount,  setEditingDiscount]  = useState<Discount | null>(null);
  const [deleteConfirmId,  setDeleteConfirmId]  = useState<string | null>(null);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState<StatusFilter>('all');
  const [expandedId,       setExpandedId]       = useState<string | null>(null);
  const [toast,            setToast]            = useState<Toast | null>(null);
  const [fieldErrors,      setFieldErrors]      = useState<Partial<Record<keyof FormData, string>>>({});
  const [formData,         setFormData]         = useState<FormData>({
    product_id: '', percentage: '', start_date: '', end_date: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchDiscounts(); fetchProducts();
  }, [user, navigate]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  const updateField = <K extends keyof FormData>(key: K, value: string) => {
    setFormData(f => ({ ...f, [key]: value }));
    setFieldErrors(fe => ({ ...fe, [key]: undefined }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!formData.product_id)                                             e.product_id = 'Select a product';
    const pct = parseFloat(formData.percentage);
    if (!formData.percentage || isNaN(pct) || pct <= 0)                  e.percentage = 'Enter a valid percentage (1–100)';
    else if (pct > 100)                                                   e.percentage = 'Discount cannot exceed 100%';
    if (!formData.start_date)                                             e.start_date = 'Start date is required';
    if (!formData.end_date)                                               e.end_date   = 'End date is required';
    if (formData.start_date && formData.end_date &&
        new Date(formData.end_date) <= new Date(formData.start_date))    e.end_date   = 'End date must be after start date';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const fetchDiscounts = async () => {
    setLoadingDiscounts(true);
    try {
      const { data, error } = await supabase
        .from('discounts').select('*, products(name, price, image_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDiscounts(data ?? []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load discounts. Check your connection.', 'error');
    } finally { setLoadingDiscounts(false); }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products').select('id, name, price, stock, category').gt('stock', 0).order('name');
      if (error) throw error;
      setProducts(data ?? []);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        product_id: formData.product_id, percentage: parseFloat(formData.percentage),
        start_date: formData.start_date, end_date: formData.end_date, created_by: user?.id,
      };
      if (editingDiscount) {
        const { error } = await supabase.from('discounts').update(payload).eq('id', editingDiscount.id);
        if (error) throw error;
        showToast('Discount updated successfully', 'success');
      } else {
        const { error } = await supabase.from('discounts').insert([payload]);
        if (error) throw error;
        showToast('Discount created successfully', 'success');
      }
      resetForm(); fetchDiscounts();
    } catch (err: any) {
      console.error(err);
      showToast(err.message ?? 'Failed to save discount', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('discounts').delete().eq('id', id);
      if (error) throw error;
      setDiscounts(prev => prev.filter(d => d.id !== id));
      setDeleteConfirmId(null);
      showToast('Discount deleted', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to delete discount', 'error');
    } finally { setSubmitting(false); }
  };

  const handleEdit = (d: Discount) => {
    setEditingDiscount(d);
    setFormData({
      product_id: d.product_id, percentage: d.percentage.toString(),
      start_date: d.start_date.split('T')[0], end_date: d.end_date.split('T')[0],
    });
    setFieldErrors({});
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ product_id: '', percentage: '', start_date: '', end_date: '' });
    setEditingDiscount(null);
    setShowForm(false);
    setFieldErrors({});
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeCount    = discounts.filter(d => getDiscountStatus(d) === 'active').length;
  const scheduledCount = discounts.filter(d => getDiscountStatus(d) === 'scheduled').length;
  const expiredCount   = discounts.filter(d => getDiscountStatus(d) === 'expired').length;
  const avgPct         = discounts.length
    ? discounts.reduce((a, d) => a + d.percentage, 0) / discounts.length : 0;

  const filteredDiscounts = discounts.filter(d => {
    const name = d.products?.name ?? '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || getDiscountStatus(d) === statusFilter);
  });

  const previewProduct = products.find(p => p.id === formData.product_id);
  const previewPct     = parseFloat(formData.percentage) || 0;
  const previewDays    = formData.start_date && formData.end_date
    ? Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / 86_400_000)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Discounts & Offers" subtitle="Manage promotional campaigns and special offers">
      <div className="space-y-4 sm:space-y-6">

        {/* ── Stats grid — already 2-col on mobile ──────────────────────────── */}
        {loadingDiscounts ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {([
              { icon: CheckCircle, label: 'Active',        value: activeCount,             iconBg: 'bg-emerald-50',  iconCls: 'text-emerald-500' },
              { icon: Clock,       label: 'Scheduled',     value: scheduledCount,          iconBg: 'bg-sky-50',      iconCls: 'text-sky-500'     },
              { icon: X,           label: 'Expired',       value: expiredCount,            iconBg: 'bg-neutral-100', iconCls: 'text-neutral-400' },
              { icon: Percent,     label: 'Avg. Discount', value: `${avgPct.toFixed(1)}%`, iconBg: 'bg-violet-50',   iconCls: 'text-violet-500'  },
            ] as const).map(({ icon: Icon, label, value, iconBg, iconCls }) => (
              <div key={label} className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-4 shadow-sm hover:border-neutral-300 transition-all">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl ${iconBg} flex items-center justify-center mb-2.5 sm:mb-3`}>
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconCls}`} />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight">{value}</p>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Toolbar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 w-full sm:w-auto">

            {/* Search */}
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 pointer-events-none" />
              <input
                type="text" placeholder="Search discounts…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-neutral-200 rounded-xl px-2.5 sm:px-3 shadow-sm">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 flex-shrink-0" />
              <select
                value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="text-sm font-medium text-neutral-700 bg-transparent border-none outline-none py-2 sm:py-2.5 pr-1 cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setFieldErrors({}); setShowForm(true); }}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex-shrink-0 w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Create Discount
          </motion.button>
        </div>

        {/* Results count */}
        {!loadingDiscounts && (
          <p className="text-xs text-neutral-400 font-medium -mt-1 sm:-mt-2">
            <span className="text-neutral-700 font-semibold">{filteredDiscounts.length}</span>
            {' '}discount{filteredDiscounts.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' && <> · <span className="capitalize">{statusFilter}</span></>}
          </p>
        )}

        {/* ── Discount list ─────────────────────────────────────────────────── */}
        <div className="space-y-2.5 sm:space-y-3">
          {loadingDiscounts ? (
            Array.from({ length: 4 }).map((_, i) => <DiscountSkeleton key={i} />)
          ) : filteredDiscounts.length > 0 ? (
            filteredDiscounts.map((discount, idx) => {
              const status     = getDiscountStatus(discount);
              const { label, cls, dot, Icon: SIcon } = STATUS_CFG[status];
              const origPrice  = discount.products?.price ?? 0;
              const discPrice  = origPrice * (1 - discount.percentage / 100);
              const savings    = origPrice - discPrice;
              const isExpanded = expandedId === discount.id;

              return (
                <motion.div
                  key={discount.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.28 }}
                  className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
                    status === 'expired'
                      ? 'border-neutral-200/70 opacity-75 hover:opacity-100 hover:border-neutral-300'
                      : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'
                  }`}
                >
                  {/* Row header */}
                  <div className="flex items-start gap-3 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-4">

                    {/* % badge — smaller on mobile */}
                    <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed ${
                      status === 'active'    ? 'border-primary/30 bg-primary/5' :
                      status === 'scheduled' ? 'border-sky-200 bg-sky-50/50'   :
                      'border-neutral-200 bg-neutral-50'
                    }`}>
                      <span className={`text-base sm:text-xl font-black leading-none tabular-nums ${
                        status === 'active' ? 'text-primary' : status === 'scheduled' ? 'text-sky-600' : 'text-neutral-400'
                      }`}>{discount.percentage}</span>
                      <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${
                        status === 'active' ? 'text-primary/70' : status === 'scheduled' ? 'text-sky-500' : 'text-neutral-400'
                      }`}>% OFF</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-semibold text-neutral-900">
                          {discount.products?.name ?? 'Unknown Product'}
                        </p>
                        {/* Full badge on sm+, dot only on mobile */}
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
                          <SIcon className="w-3 h-3" />{label}
                        </span>
                        <span className={`sm:hidden w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                        <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">{daysInfo(discount)}</span>
                      </div>

                      {/* Price info — hidden on mobile when too long */}
                      {origPrice > 0 && (
                        <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5 sm:mt-1 truncate">
                          <span className="line-through">KES {origPrice.toLocaleString('en-KE')}</span>
                          {' → '}
                          <span className="font-semibold text-neutral-800">KES {Math.round(discPrice).toLocaleString('en-KE')}</span>
                          <span className="text-emerald-600 font-medium hidden sm:inline"> · Save KES {Math.round(savings).toLocaleString('en-KE')}</span>
                        </p>
                      )}
                      <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5">
                        <Calendar className="inline w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                        {fmtDate(discount.start_date)} – {fmtDate(discount.end_date)}
                      </p>
                    </div>

                    {/* Actions — always visible (no hover gate needed) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      <button onClick={() => handleEdit(discount)}
                        className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        title="Edit">
                        <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(discount.id)}
                        className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete">
                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : discount.id)}
                        className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        title="Details">
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable details */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-neutral-100 px-3.5 sm:px-5 py-3.5 sm:py-4 space-y-3.5 sm:space-y-4">

                          {/* Product breakdown */}
                          {discount.products && (
                            <div>
                              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2.5 sm:mb-3">
                                Product Details
                              </p>
                              <div className="flex items-center gap-3 sm:gap-4 bg-neutral-50 rounded-xl p-3 sm:p-4 border border-neutral-100">
                                {discount.products.image_url && (
                                  <img src={discount.products.image_url} alt={discount.products.name}
                                    className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg flex-shrink-0" />
                                )}
                                {/* 2-col always (was 2-col mobile / 4-col sm) */}
                                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 text-xs">
                                  {[
                                    { label: 'Original Price',   value: `KES ${origPrice.toLocaleString('en-KE')}`,               cls: 'text-neutral-700'           },
                                    { label: 'Discounted',       value: `KES ${Math.round(discPrice).toLocaleString('en-KE')}`,    cls: 'text-emerald-600 font-bold'  },
                                    { label: 'Discount',         value: `${discount.percentage}% OFF`,                             cls: 'text-red-500 font-bold'      },
                                    { label: 'Customer Saves',   value: `KES ${Math.round(savings).toLocaleString('en-KE')}`,      cls: 'text-emerald-600'            },
                                  ].map(({ label, value, cls }) => (
                                    <div key={label}>
                                      <span className="text-neutral-400 block text-[10px] sm:text-[11px]">{label}</span>
                                      <span className={`font-semibold text-xs sm:text-sm ${cls}`}>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Timeline */}
                          <div>
                            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2.5 sm:mb-3">
                              Timeline
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {[
                                { label: 'Start Date', date: discount.start_date, Icon: Calendar },
                                { label: 'End Date',   date: discount.end_date,   Icon: Clock    },
                              ].map(({ label, date, Icon: DIcon }) => (
                                <div key={label} className="flex items-center gap-2.5 sm:gap-3 bg-neutral-50 rounded-xl p-3 sm:p-3.5 border border-neutral-100">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white border border-neutral-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <DIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-500" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">{label}</p>
                                    <p className="text-[11px] sm:text-xs font-semibold text-neutral-800">{fmtLong(date)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 sm:gap-4 py-14 sm:py-20 bg-white rounded-xl border border-neutral-200">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
                <Tag className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-700">
                  {searchTerm || statusFilter !== 'all' ? 'No discounts found' : 'No discounts yet'}
                </p>
                <p className="text-xs text-neutral-400 mt-1 max-w-[200px] sm:max-w-none">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'Create your first discount to get started'}
                </p>
              </div>
              {!searchTerm && statusFilter === 'all' ? (
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors">
                  <Plus className="w-4 h-4" /> Create Discount
                </button>
              ) : (
                <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-all">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-neutral-900 text-center">Delete Discount?</h3>
              <p className="text-xs sm:text-sm text-neutral-500 text-center mt-1.5 mb-5 sm:mb-6">
                This will permanently remove the discount and cannot be undone.
              </p>
              <div className="flex gap-2.5 sm:gap-3">
                <button onClick={() => setDeleteConfirmId(null)} disabled={submitting}
                  className="flex-1 px-4 py-2 sm:py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirmId!)} disabled={submitting}
                  className="flex-1 px-4 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create / Edit form modal — bottom sheet on mobile ─────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 40 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.93, opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[96vh] sm:max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
                {/* Mobile drag handle */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-neutral-200 rounded-full sm:hidden" />
                <div className="flex items-center gap-2.5 sm:gap-3 mt-3 sm:mt-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-neutral-100 rounded-xl flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-neutral-900">
                      {editingDiscount ? 'Edit Discount' : 'Create Discount'}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">
                      Set product, percentage, and date range
                    </p>
                  </div>
                </div>
                <button onClick={resetForm}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">

                {/* Product select */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Product <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.product_id} onChange={e => updateField('product_id', e.target.value)}
                    className={inputCls(fieldErrors.product_id)}
                  >
                    <option value="">Select a product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} · KES {p.price.toLocaleString('en-KE')}
                      </option>
                    ))}
                  </select>
                  <FieldError msg={fieldErrors.product_id} />
                </div>

                {/* Percentage */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Discount Percentage <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" value={formData.percentage} placeholder="e.g. 20"
                      min="1" max="100" step="0.01"
                      onChange={e => updateField('percentage', e.target.value)}
                      className={`${inputCls(fieldErrors.percentage)} pr-10`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-medium pointer-events-none">%</span>
                  </div>
                  {previewPct > 0 && (
                    <div className="mt-2 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(previewPct, 100)}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          previewPct >= 50 ? 'bg-red-400' : previewPct >= 25 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                  )}
                  <FieldError msg={fieldErrors.percentage} />
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <input type="date" value={formData.start_date}
                      onChange={e => updateField('start_date', e.target.value)}
                      className={inputCls(fieldErrors.start_date)} />
                    <FieldError msg={fieldErrors.start_date} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
                      End Date <span className="text-red-400">*</span>
                    </label>
                    <input type="date" value={formData.end_date}
                      onChange={e => updateField('end_date', e.target.value)}
                      className={inputCls(fieldErrors.end_date)} />
                    <FieldError msg={fieldErrors.end_date} />
                  </div>
                </div>
                {previewDays > 0 && (
                  <p className="text-xs text-neutral-400 -mt-1 sm:-mt-2">
                    Campaign duration: <span className="font-semibold text-neutral-700">{previewDays} day{previewDays !== 1 ? 's' : ''}</span>
                  </p>
                )}

                {/* Live pricing preview */}
                <AnimatePresence>
                  {previewProduct && previewPct > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
                      className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 sm:p-4"
                    >
                      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2.5 sm:mb-3">
                        Live Preview
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 truncate">{previewProduct.name}</p>
                          <p className="text-xs text-neutral-400 line-through mt-0.5">
                            KES {previewProduct.price.toLocaleString('en-KE')}
                          </p>
                          <p className="text-base sm:text-lg font-black text-neutral-900">
                            KES {Math.round(previewProduct.price * (1 - previewPct / 100)).toLocaleString('en-KE')}
                          </p>
                          <p className="text-xs text-emerald-600 font-medium mt-0.5">
                            Saves KES {Math.round(previewProduct.price * previewPct / 100).toLocaleString('en-KE')}
                          </p>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 flex-shrink-0">
                          <span className="text-lg sm:text-xl font-black text-primary leading-none">{previewPct}</span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-primary/70 uppercase tracking-wider">% OFF</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-neutral-100">
                  <button type="button" onClick={resetForm} disabled={submitting}
                    className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                    {submitting
                      ? <><RefreshCw className="w-4 h-4 animate-spin" />{editingDiscount ? 'Updating…' : 'Creating…'}</>
                      : editingDiscount ? 'Update Discount' : 'Create Discount'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast — full-width on mobile ───────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[70] flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white shadow-lg shadow-neutral-900/10 border ${
              toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-500   flex-shrink-0" />}
            <span className={`text-sm font-medium flex-1 ${toast.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
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

export default DiscountsOffers;

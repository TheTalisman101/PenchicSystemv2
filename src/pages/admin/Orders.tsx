import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package2, Download, Search, Calendar, Filter,
  ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign,
  CheckCircle, Clock, AlertCircle, Truck, RefreshCcw,
  ChevronDown, ChevronUp, X, SlidersHorizontal, ChevronLeft,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string; quantity: number; price?: number;
  discount_amount?: number; product_id: string;
  products: { name: string; price: number } | null;
}
interface Payment { payment_method: string }
interface Order {
  id: string; status: string; created_at: string;
  profiles: { email: string } | null;
  order_items: OrderItem[]; payments: Payment[];
}
interface PeriodStats {
  total: number; pending: number; processing: number; completed: number;
  totalRevenue: number; grossRevenue: number; totalDiscount: number; averageOrder: number;
}
type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

// ── Pure helpers ───────────────────────────────────────────────────────────────
const itemNet           = (i: OrderItem) => ((i.products?.price ?? i.price ?? 0) - (i.discount_amount ?? 0)) * i.quantity;
const itemGross         = (i: OrderItem) => (i.products?.price ?? i.price ?? 0) * i.quantity;
const itemDiscountTotal = (i: OrderItem) => (i.discount_amount ?? 0) * i.quantity;
const calcOrderTotal    = (items: OrderItem[]) => (items ?? []).reduce((a, i) => a + itemNet(i), 0);
const fmt               = (n: number) => Math.round(n).toLocaleString('en-KE');
const fmtExact          = (n: number) => n.toFixed(2);
const pctChange         = (curr: number, prev: number) =>
  prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
const relDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
const relTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

const getDateRange = (period: ReportPeriod, s: string, e: string) => {
  const now = new Date();
  switch (period) {
    case 'daily':   return { start: new Date(new Date().setHours(0,0,0,0)), end: now };
    case 'weekly':  { const d = new Date(now); d.setDate(now.getDate()-6); d.setHours(0,0,0,0); return { start: d, end: now }; }
    case 'monthly': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'yearly':  return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'custom':  return s && e
      ? { start: new Date(s+'T00:00:00'), end: new Date(e+'T23:59:59') }
      : { start: now, end: now };
  }
};

const getPrevDateRange = (period: ReportPeriod, cur: { start: Date; end: Date }) => {
  const { start, end } = cur;
  if (period === 'monthly') return { start: new Date(start.getFullYear(), start.getMonth()-1, 1), end: new Date(start.getTime()-1) };
  if (period === 'yearly')  return { start: new Date(start.getFullYear()-1, 0, 1),               end: new Date(start.getTime()-1) };
  const dur = end.getTime() - start.getTime();
  return { start: new Date(start.getTime()-dur-1), end: new Date(start.getTime()-1) };
};

const calcStats = (orders: Order[]): PeriodStats => {
  const s = orders.reduce((acc, o) => {
    acc.total++;
    if (o.status in acc) (acc as any)[o.status]++;
    const items = o.order_items ?? [];
    acc.totalRevenue  += items.reduce((x,i)=>x+itemNet(i),0);
    acc.grossRevenue  += items.reduce((x,i)=>x+itemGross(i),0);
    acc.totalDiscount += items.reduce((x,i)=>x+itemDiscountTotal(i),0);
    return acc;
  }, { total:0, pending:0, processing:0, completed:0, totalRevenue:0, grossRevenue:0, totalDiscount:0 });
  return { ...s, averageOrder: s.total > 0 ? s.totalRevenue / s.total : 0 };
};

// ── Static config ──────────────────────────────────────────────────────────────
const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'daily',   label: 'Today'        },
  { value: 'weekly',  label: 'This Week'    },
  { value: 'monthly', label: 'This Month'   },
  { value: 'yearly',  label: 'This Year'    },
  { value: 'custom',  label: 'Custom Range' },
];
const PERIOD_LABELS: Record<ReportPeriod, string> =
  Object.fromEntries(PERIOD_OPTIONS.map(p => [p.value, p.label])) as any;

const STATUS_FILTERS = [
  { value: 'all',        label: 'All statuses', dot: 'bg-neutral-300'  },
  { value: 'pending',    label: 'Pending',       dot: 'bg-amber-400'   },
  { value: 'processing', label: 'Processing',    dot: 'bg-sky-400'     },
  { value: 'completed',  label: 'Completed',     dot: 'bg-emerald-500' },
  { value: 'cancelled',  label: 'Cancelled',     dot: 'bg-red-400'     },
] as const;

const STATUS_CFG = {
  pending:    { label: 'Pending',    cls: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200/60',   dot: 'bg-amber-400',   Icon: Clock       },
  processing: { label: 'Processing', cls: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200/60',     dot: 'bg-sky-400',     Icon: RefreshCcw  },
  completed:  { label: 'Completed',  cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dot: 'bg-emerald-500', Icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50     text-red-600     ring-1 ring-red-200/60',     dot: 'bg-red-400',     Icon: AlertCircle },
} as const;

// ── Sub-components ─────────────────────────────────────────────────────────────
const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-[2px] sm:py-[3px] rounded-full text-[10px] sm:text-[11px] font-semibold
      ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      {up ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

/* Skeletons — sized for 2-col mobile grid */
const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 animate-pulse">
    <div className="flex items-start justify-between mb-3 sm:mb-4">
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neutral-200 rounded-xl" />
      <div className="w-14 sm:w-20 h-4 sm:h-5 bg-neutral-100 rounded-full" />
    </div>
    <div className="w-24 sm:w-32 h-5 sm:h-7 bg-neutral-200 rounded-lg mb-1.5 sm:mb-2" />
    <div className="w-20 sm:w-24 h-2.5 sm:h-3 bg-neutral-100 rounded-full" />
    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
      <div className="w-24 sm:w-28 h-2 sm:h-2.5 bg-neutral-100 rounded-full" />
    </div>
  </div>
);

const OrderSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-1.5 sm:space-y-2">
        <div className="w-28 sm:w-36 h-3.5 sm:h-4 bg-neutral-200 rounded-full" />
        <div className="w-44 sm:w-56 h-2.5 sm:h-3 bg-neutral-100 rounded-full" />
      </div>
      <div className="w-20 sm:w-28 h-7 sm:h-8 bg-neutral-100 rounded-lg" />
    </div>
  </div>
);

// ── Sidebar filters ────────────────────────────────────────────────────────────
interface SidebarProps {
  reportPeriod: ReportPeriod; setReportPeriod: (p: ReportPeriod) => void;
  customStartDate: string; setCustomStartDate: (v: string) => void;
  customEndDate: string; setCustomEndDate: (v: string) => void;
  filter: string; setFilter: (v: string) => void;
  searchTerm: string; setSearchTerm: (v: string) => void;
  statusCounts: Record<string, number>; totalOrders: number;
  onClear: () => void; hasActiveFilters: boolean;
}

const SidebarFilters: React.FC<SidebarProps> = ({
  reportPeriod, setReportPeriod,
  customStartDate, setCustomStartDate,
  customEndDate, setCustomEndDate,
  filter, setFilter,
  searchTerm, setSearchTerm,
  statusCounts, totalOrders,
  onClear, hasActiveFilters,
}) => (
  <div className="space-y-5">

    {/* Search */}
    <div>
      <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Search</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
        <input
          type="text" placeholder="Email or order ID…" value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>

    {/* Period */}
    <div>
      <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Time Period</label>
      <div className="space-y-1">
        {PERIOD_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setReportPeriod(opt.value)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              reportPeriod === opt.value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}>
            {opt.label}
            {reportPeriod === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>

    {/* Custom date inputs */}
    <AnimatePresence>
      {reportPeriod === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="space-y-2 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">From</label>
              <input type="date" value={customStartDate} max={customEndDate || undefined}
                onChange={e => setCustomStartDate(e.target.value)}
                className="w-full text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">To</label>
              <input type="date" value={customEndDate} min={customStartDate || undefined}
                onChange={e => setCustomEndDate(e.target.value)}
                className="w-full text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all" />
            </div>
            {customStartDate && customEndDate && new Date(customStartDate) > new Date(customEndDate) && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Start must be before end
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Status filter */}
    <div>
      <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Status</label>
      <div className="space-y-1">
        {STATUS_FILTERS.map(({ value, label, dot }) => {
          const count = value === 'all' ? totalOrders : (statusCounts[value] ?? 0);
          return (
            <button key={value} onClick={() => setFilter(value)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filter === value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot} ${filter === value ? 'opacity-80' : ''}`} />
                {label}
              </div>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === value ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-500'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>

    {hasActiveFilters && (
      <button onClick={onClear}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 transition-all">
        <X className="w-3.5 h-3.5" /> Clear all filters
      </button>
    )}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const Orders = () => {
  const navigate = useNavigate();
  const user     = useStore(s => s.user);

  const [allOrders,       setAllOrders]       = useState<Order[]>([]);
  const [productNames,    setProductNames]    = useState<Record<string, string>>({});
  const [loading,         setLoading]         = useState(true);
  const [filter,          setFilter]          = useState('all');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [reportPeriod,    setReportPeriod]    = useState<ReportPeriod>('monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate,   setCustomEndDate]   = useState('');
  const [expandedOrders,  setExpandedOrders]  = useState<Set<string>>(new Set());
  const [updatingId,      setUpdatingId]      = useState<string | null>(null);
  const [isExporting,     setIsExporting]     = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);

  useEffect(() => { if (!user || user.role !== 'admin') navigate('/'); }, [user, navigate]);
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: ordersData, error: oErr }, { data: products, error: pErr }] = await Promise.all([
        supabase.from('orders')
          .select('*, profiles(email), order_items(*, products(name, price)), payments(*)')
          .order('created_at', { ascending: false }),
        supabase.from('products').select('id, name'),
      ]);
      if (oErr) throw oErr;
      if (pErr) throw pErr;
      const nameMap: Record<string, string> = {};
      (products ?? []).forEach(p => { nameMap[p.id] = p.name; });
      setProductNames(nameMap);
      setAllOrders(ordersData ?? []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally { setLoading(false); }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const dateRange = useMemo(
    () => getDateRange(reportPeriod, customStartDate, customEndDate),
    [reportPeriod, customStartDate, customEndDate]
  );
  const prevRange = useMemo(() => getPrevDateRange(reportPeriod, dateRange), [reportPeriod, dateRange]);

  const periodOrders = useMemo(
    () => allOrders.filter(o => { const d = new Date(o.created_at); return d >= dateRange.start && d <= dateRange.end; }),
    [allOrders, dateRange]
  );
  const prevPeriodOrders = useMemo(
    () => allOrders.filter(o => { const d = new Date(o.created_at); return d >= prevRange.start && d <= prevRange.end; }),
    [allOrders, prevRange]
  );
  const currStats = useMemo(() => calcStats(periodOrders),     [periodOrders]);
  const prevStats = useMemo(() => calcStats(prevPeriodOrders), [prevPeriodOrders]);

  const ordersChange  = pctChange(currStats.total,        prevStats.total);
  const revenueChange = pctChange(currStats.totalRevenue, prevStats.totalRevenue);
  const avgChange     = pctChange(currStats.averageOrder, prevStats.averageOrder);

  const statusCounts = useMemo(
    () => periodOrders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    [periodOrders]
  );

  const displayOrders = useMemo(
    () => periodOrders
      .filter(o => filter === 'all' || o.status === filter)
      .filter(o => !searchTerm ||
        (o.profiles?.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [periodOrders, filter, searchTerm]
  );

  const hasActiveFilters    = filter !== 'all' || !!searchTerm;
  const handleClearFilters  = () => { setFilter('all'); setSearchTerm(''); };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Error updating order:', err);
    } finally { setUpdatingId(null); }
  };

  const toggleExpanded = useCallback((id: string) =>
    setExpandedOrders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  // ── CSV export ─────────────────────────────────────────────────────────────
  const downloadReport = () => {
    setIsExporting(true);
    try {
      const { start, end } = dateRange;
      const productSales: Record<string, { quantity: number; grossRevenue: number; discount: number; netRevenue: number; orders: Set<string> }> = {};
      const paymentBreakdown: Record<string, { count: number; gross: number; net: number }> = {};
      const statusBreakdown:  Record<string, { count: number; net: number }> = {};

      const totals = periodOrders.reduce((acc, order) => {
        const items      = order.order_items ?? [];
        const orderNet   = calcOrderTotal(items);
        const orderGross = items.reduce((s,i)=>s+itemGross(i),0);
        const orderDisc  = items.reduce((s,i)=>s+itemDiscountTotal(i),0);
        acc.orders++; acc.net+=orderNet; acc.gross+=orderGross;
        acc.discount+=orderDisc; acc.items+=items.reduce((s,i)=>s+i.quantity,0);
        items.forEach(item => {
          const name = item.products?.name ?? productNames[item.product_id] ?? item.product_id;
          if (!productSales[name]) productSales[name] = { quantity:0,grossRevenue:0,discount:0,netRevenue:0,orders:new Set() };
          productSales[name].quantity+=item.quantity; productSales[name].grossRevenue+=itemGross(item);
          productSales[name].discount+=itemDiscountTotal(item); productSales[name].netRevenue+=itemNet(item);
          productSales[name].orders.add(order.id);
        });
        const method = (order.payments?.[0]?.payment_method ?? 'Unknown').toUpperCase();
        if (!paymentBreakdown[method]) paymentBreakdown[method] = { count:0,gross:0,net:0 };
        paymentBreakdown[method].count++; paymentBreakdown[method].gross+=orderGross; paymentBreakdown[method].net+=orderNet;
        const st = order.status.toUpperCase();
        if (!statusBreakdown[st]) statusBreakdown[st] = { count:0,net:0 };
        statusBreakdown[st].count++; statusBreakdown[st].net+=orderNet;
        return acc;
      }, { orders:0,net:0,gross:0,discount:0,items:0 });

      const lines = [
        'PENCHIC FARM - ORDER REPORT',
        `Period,${PERIOD_LABELS[reportPeriod]}`,
        `Date Range,${start.toLocaleDateString('en-KE')} to ${end.toLocaleDateString('en-KE')}`,
        `Generated,${new Date().toLocaleString('en-KE')}`,
        `Generated By,${user?.email ?? 'Admin'}`,
        '', '=== ORDER DETAILS ===',
        'Order ID,Date,Time,Customer,Products,Qty,Unit Price (KES),Discount/Unit (KES),Line Net (KES),Order Gross (KES),Order Discount (KES),Order Net (KES),Payment,Status',
        ...periodOrders.map(o => {
          const items      = o.order_items ?? [];
          const orderNet   = calcOrderTotal(items);
          const orderGross = items.reduce((s,i)=>s+itemGross(i),0);
          const orderDisc  = items.reduce((s,i)=>s+itemDiscountTotal(i),0);
          const d          = new Date(o.created_at);
          return [
            o.id.slice(0,8), d.toLocaleDateString('en-KE'),
            d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}),
            o.profiles?.email ?? 'N/A',
            '"'+items.map(i=>i.products?.name??productNames[i.product_id]??i.product_id).join('; ')+'"',
            items.map(i=>i.quantity).join('; '),
            items.map(i=>fmtExact(i.products?.price??i.price??0)).join('; '),
            items.map(i=>fmtExact(i.discount_amount??0)).join('; '),
            items.map(i=>fmtExact(itemNet(i))).join('; '),
            fmtExact(orderGross), fmtExact(orderDisc), fmtExact(orderNet),
            (o.payments?.[0]?.payment_method??"N/A").toUpperCase(), o.status.toUpperCase(),
          ].join(',');
        }),
        '', '=== SUMMARY ===',
        `Total Orders,${totals.orders}`, `Gross Revenue,${fmtExact(totals.gross)}`,
        `Total Discounts,${fmtExact(totals.discount)}`, `Net Revenue,${fmtExact(totals.net)}`,
        `Avg Order Value,${totals.orders>0?fmtExact(totals.net/totals.orders):'0.00'}`,
        '', '=== STATUS ===', 'Status,Orders,Net Revenue (KES)',
        ...Object.entries(statusBreakdown).map(([s,d])=>`${s},${d.count},${fmtExact(d.net)}`),
        '', '=== PRODUCTS ===', 'Product,Units,Gross (KES),Discount (KES),Net (KES)',
        ...Object.entries(productSales).sort(([,a],[,b])=>b.netRevenue-a.netRevenue)
          .map(([n,d])=>`"${n}",${d.quantity},${fmtExact(d.grossRevenue)},${fmtExact(d.discount)},${fmtExact(d.netRevenue)}`),
        '', '=== PAYMENT METHODS ===', 'Method,Orders,Gross (KES),Net (KES)',
        ...Object.entries(paymentBreakdown).map(([m,d])=>`${m},${d.count},${fmtExact(d.gross)},${fmtExact(d.net)}`),
      ];

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `penchic-orders-${reportPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error('Export error:', err); }
    finally { setIsExporting(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <AdminLayout title="Orders" subtitle="Manage and track all orders">
      <div className="flex gap-4 sm:gap-6">
        <div className="hidden lg:block w-60 flex-shrink-0 space-y-4">
          {Array.from({length:3}).map((_,i)=>(
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse space-y-3">
              <div className="w-24 h-2.5 bg-neutral-200 rounded-full" />
              {Array.from({length:4}).map((_,j)=><div key={j} className="w-full h-9 bg-neutral-100 rounded-xl" />)}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* 2-col on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {Array.from({length:4}).map((_,i)=><StatSkeleton key={i}/>)}
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {Array.from({length:5}).map((_,i)=><OrderSkeleton key={i}/>)}
          </div>
        </div>
      </div>
    </AdminLayout>
  );

  const periodLabel  = PERIOD_LABELS[reportPeriod];
  const sidebarProps: SidebarProps = {
    reportPeriod, setReportPeriod, customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate, filter, setFilter,
    searchTerm, setSearchTerm, statusCounts,
    totalOrders: periodOrders.length, onClear: handleClearFilters, hasActiveFilters,
  };

  return (
    <AdminLayout title="Orders" subtitle="Manage and track all orders">

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="fixed top-0 left-0 h-full w-72 bg-white border-r border-neutral-200 shadow-2xl z-50 lg:hidden flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-sm font-semibold text-neutral-900">Filters</h3>
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                </div>
                <button onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <SidebarFilters {...sidebarProps} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex gap-4 sm:gap-6">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="sticky top-4 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-neutral-100">
              <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900">Filters</h3>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-400 ml-auto flex-shrink-0" />}
            </div>
            <div className="p-4"><SidebarFilters {...sidebarProps} /></div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">

          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </button>

            <p className="hidden lg:block text-sm font-semibold text-neutral-700">{periodLabel}</p>

            <button onClick={downloadReport}
              disabled={isExporting || periodOrders.length === 0}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium rounded-xl transition-colors shadow-sm ml-auto">
              <Download className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isExporting ? 'Exporting…' : `Export (${periodOrders.length})`}</span>
              <span className="sm:hidden">{isExporting ? '…' : `CSV`}</span>
            </button>
          </div>

          {/* ── KPI cards — 2-col on mobile ────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">

            {/* Orders */}
            <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                  <Package2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
                </div>
                <TrendBadge value={ordersChange} />
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight">
                {currStats.total}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1 truncate">Orders · {periodLabel}</p>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
                <p className="text-[10px] sm:text-[11px] text-neutral-400">
                  Prior: <span className="font-semibold text-neutral-600">{prevStats.total}</span>
                </p>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <TrendBadge value={revenueChange} />
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight truncate">
                KES {fmt(currStats.totalRevenue)}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1">Net revenue</p>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
                <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
                  <span className="hidden sm:inline">Gross: </span>
                  <span className="font-semibold text-neutral-600">KES {fmt(currStats.grossRevenue)}</span>
                  {' '}<span className="text-emerald-600 font-semibold">−{fmt(currStats.totalDiscount)}</span>
                </p>
              </div>
            </div>

            {/* Avg order */}
            <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                </div>
                <TrendBadge value={avgChange} />
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight truncate">
                KES {fmt(currStats.averageOrder)}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1">Avg. order (net)</p>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
                <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
                  Prior: <span className="font-semibold text-neutral-600">KES {fmt(prevStats.averageOrder)}</span>
                </p>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 shadow-sm hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-2.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                </div>
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight">
                {currStats.total}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1">Status breakdown</p>
              <div className="mt-2.5 sm:mt-3 space-y-1 sm:space-y-1.5">
                {([
                  { key: 'pending',    label: 'Pending',    cls: 'text-amber-600'   },
                  { key: 'processing', label: 'Processing', cls: 'text-sky-600'     },
                  { key: 'completed',  label: 'Completed',  cls: 'text-emerald-600' },
                ] as const).map(({ key, label, cls }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className={`text-[10px] sm:text-[11px] font-semibold ${cls}`}>{label}</span>
                    <span className="text-xs font-bold text-neutral-700 tabular-nums">{currStats[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results summary */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-400 font-medium">
              <span className="text-neutral-700 font-semibold">{displayOrders.length}</span>
              {' '}order{displayOrders.length !== 1 ? 's' : ''} · {periodLabel}
            </p>
            {hasActiveFilters && (
              <button onClick={handleClearFilters}
                className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
                Clear filters
              </button>
            )}
          </div>

          {/* ── Orders list ───────────────────────────────────────────────── */}
          <div className="space-y-2.5 sm:space-y-3">
            {displayOrders.map((order, idx) => {
              const total      = calcOrderTotal(order.order_items);
              const gross      = (order.order_items ?? []).reduce((s,i)=>s+itemGross(i),0);
              const disc       = (order.order_items ?? []).reduce((s,i)=>s+itemDiscountTotal(i),0);
              const expanded   = expandedOrders.has(order.id);
              const cfg        = STATUS_CFG[order.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
              const StatusIcon = cfg.Icon;
              const itemCount  = (order.order_items ?? []).reduce((a,i)=>a+i.quantity,0);

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.25), duration: 0.26 }}
                  className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-3 sm:py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-bold text-neutral-900">
                          #{order.id.slice(0,8).toUpperCase()}
                        </p>
                        {/* Full badge on sm+, dot only on mobile */}
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
                          <StatusIcon className="w-3 h-3" />{cfg.label}
                        </span>
                        <span className={`sm:hidden w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      </div>
                      {/* Email — hidden on mobile to save space */}
                      <p className="hidden sm:block text-xs text-neutral-400 mt-0.5">
                        {order.profiles?.email ?? 'N/A'} · {relDate(order.created_at)} at {relTime(order.created_at)}
                      </p>
                      {/* Compact date on mobile */}
                      <p className="sm:hidden text-[11px] text-neutral-400 mt-0.5">
                        {relDate(order.created_at)} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                        {disc > 0 && <span className="text-emerald-600"> · −{fmt(disc)}</span>}
                      </p>
                      <p className="hidden sm:block text-xs text-neutral-400 mt-0.5">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                        {disc > 0 && <span className="text-emerald-600"> · −KES {fmt(disc)} discount</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 w-full sm:w-auto">
                      <p className="text-xs sm:text-sm font-bold text-neutral-900 tabular-nums">
                        KES {fmt(total)}
                      </p>
                      <select
                        value={order.status}
                        onChange={e => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingId === order.id}
                        className={[
                          'text-[11px] sm:text-xs font-semibold border rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 outline-none transition-all cursor-pointer disabled:opacity-50 flex-1 sm:flex-none',
                          order.status === 'pending'    ? 'bg-amber-50   border-amber-200   text-amber-700'   :
                          order.status === 'processing' ? 'bg-sky-50     border-sky-200     text-sky-700'     :
                          order.status === 'completed'  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          'bg-neutral-50 border-neutral-200 text-neutral-600',
                        ].join(' ')}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button onClick={() => toggleExpanded(order.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0">
                        {expanded
                          ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded items */}
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-neutral-100 px-3.5 sm:px-5 pt-3 pb-3.5 sm:pb-4 space-y-1.5 sm:space-y-2">
                          {(order.order_items ?? []).map((item, i) => {
                            const price    = item.products?.price ?? item.price ?? 0;
                            const discount = item.discount_amount ?? 0;
                            const net      = itemNet(item);
                            const name     = item.products?.name ?? productNames[item.product_id] ?? item.product_id;
                            return (
                              <div key={item.id ?? i} className="flex items-center justify-between gap-2 sm:gap-4 py-1 sm:py-1.5">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-neutral-100 rounded-md flex items-center justify-center flex-shrink-0">
                                    <Package2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-neutral-800 truncate">{name}</p>
                                    <p className="text-[10px] sm:text-[11px] text-neutral-400">
                                      {item.quantity} × KES {fmt(price)}
                                      {discount > 0 && <span className="text-emerald-600 ml-1">(−{fmt(discount)} ea)</span>}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {discount > 0 && (
                                    <p className="text-[10px] sm:text-[11px] text-neutral-400 line-through tabular-nums">
                                      KES {fmt(price * item.quantity)}
                                    </p>
                                  )}
                                  <p className="text-xs sm:text-sm font-semibold text-neutral-900 tabular-nums">KES {fmt(net)}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div className="pt-2.5 sm:pt-3 mt-1 border-t border-neutral-100 space-y-1">
                            {disc > 0 && (
                              <>
                                <div className="flex justify-between text-xs text-neutral-500">
                                  <span>Gross subtotal</span><span className="tabular-nums">KES {fmt(gross)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-emerald-600">
                                  <span>Discounts</span><span className="tabular-nums">−KES {fmt(disc)}</span>
                                </div>
                              </>
                            )}
                            <div className="flex items-center justify-between pt-1">
                              <p className="text-[11px] sm:text-xs text-neutral-500">
                                <span className="hidden sm:inline">Payment: </span>
                                <span className="font-semibold text-neutral-700">
                                  {(order.payments?.[0]?.payment_method ?? 'N/A').toUpperCase()}
                                </span>
                              </p>
                              <p className="text-xs sm:text-sm font-bold text-neutral-900 tabular-nums">
                                Total: KES {fmt(total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {displayOrders.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 sm:py-16 bg-white rounded-xl border border-neutral-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
                  <Package2 className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-neutral-600">No orders found</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {hasActiveFilters ? 'Try adjusting your filters' : `No orders for ${periodLabel.toLowerCase()}`}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button onClick={handleClearFilters}
                    className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-all">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Orders;

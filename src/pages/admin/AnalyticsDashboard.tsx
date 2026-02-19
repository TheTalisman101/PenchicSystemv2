import React, { useState, useEffect } from 'react';
import {
  Package2, ShoppingCart, AlertCircle, BarChart3, TrendingUp,
  ArrowUpRight, ArrowDownRight, Calendar, ChevronDown, ChevronUp,
  RefreshCw, SlidersHorizontal, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Product    { id: string; name: string; stock: number; price: number }
interface OrderItem  { quantity: number; products: { name: string; price: number } | null }
interface Order      { id: string; status: string; created_at: string; order_items: OrderItem[] }
interface TopProduct { name: string; quantity: number; revenue: number }
interface PeriodStats { revenue: number; orders: number }
interface DateRange   { start: Date; end: Date }

// ── Date helpers ───────────────────────────────────────────────────────────────
const getDateRange = (timeRange: string, customStart: string, customEnd: string): DateRange | null => {
  const now = new Date();
  switch (timeRange) {
    case 'current':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'previous':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case 'custom': {
      if (!customStart || !customEnd) return null;
      const s = new Date(customStart);
      const e = new Date(customEnd); e.setHours(23, 59, 59, 999);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return null;
      return { start: s, end: e };
    }
    default: return null;
  }
};

const getPreviousRange = (range: DateRange): DateRange => {
  const dur = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - dur - 1), end: new Date(range.start.getTime() - 1) };
};

const comparisonLabel = (t: string) =>
  t === 'current' ? 'Last month' : t === 'previous' ? 'Month before' : 'Prior period';

// ── Pure helpers ───────────────────────────────────────────────────────────────
const getOrderTotal = (items: OrderItem[]) =>
  (items ?? []).reduce((acc, item) =>
    item?.products?.price ? acc + item.quantity * item.products.price : acc, 0);

const pctChange = (curr: number, prev: number) =>
  prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

const fmt    = (n: number) => Math.round(n).toLocaleString('en-KE');
const fmtPct = (n: number) => `${Math.abs(n).toFixed(1)}%`;

// ── Sub-components ─────────────────────────────────────────────────────────────
const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-[2px] sm:py-[3px] rounded-full text-[10px] sm:text-[11px] font-semibold ${
      up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    }`}>
      {up ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
      {fmtPct(value)}
    </span>
  );
};

/* ── Stat skeleton — 2-col on mobile ── */
const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 animate-pulse">
    <div className="flex items-start justify-between mb-3 sm:mb-4">
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neutral-200 rounded-xl" />
      <div className="w-16 sm:w-24 h-4 sm:h-5 bg-neutral-100 rounded-full" />
    </div>
    <div className="w-24 sm:w-32 h-5 sm:h-7 bg-neutral-200 rounded-lg mb-1.5 sm:mb-2" />
    <div className="w-20 sm:w-28 h-2.5 sm:h-3 bg-neutral-100 rounded-full" />
    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
      <div className="w-28 sm:w-36 h-2 sm:h-2.5 bg-neutral-100 rounded-full" />
    </div>
  </div>
);

const SectionSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden animate-pulse">
    <div className="flex justify-between items-center px-4 py-3 sm:px-5 sm:py-4 border-b border-neutral-100">
      <div className="space-y-1.5">
        <div className="w-32 sm:w-36 h-3 sm:h-3.5 bg-neutral-200 rounded-full" />
        <div className="w-20 sm:w-24 h-2 sm:h-2.5 bg-neutral-100 rounded-full" />
      </div>
      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neutral-100 rounded-xl" />
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-2.5 sm:py-3.5 border-b border-neutral-50 last:border-0">
        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-neutral-200 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-1 sm:space-y-1.5">
          <div className="w-32 sm:w-40 h-2.5 sm:h-3 bg-neutral-200 rounded-full" />
          <div className="w-full h-1.5 bg-neutral-100 rounded-full" />
        </div>
        <div className="w-16 sm:w-20 h-2.5 sm:h-3 bg-neutral-200 rounded-full" />
      </div>
    ))}
  </div>
);

const RANK_CLS = [
  'bg-amber-50  text-amber-600  ring-1 ring-amber-200/60',
  'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200',
  'bg-orange-50 text-orange-600 ring-1 ring-orange-200/60',
];
const rankCls = (i: number) => RANK_CLS[i] ?? 'bg-neutral-50 text-neutral-400';

const STATUS_MAP: Record<string, string> = {
  completed:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  processing: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200/60',
  pending:    'bg-amber-50   text-amber-700   ring-1 ring-amber-200/60',
  cancelled:  'bg-red-50     text-red-600     ring-1 ring-red-200/60',
};

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-emerald-400', processing: 'bg-sky-400',
  pending: 'bg-amber-400', cancelled: 'bg-red-400',
};

const listV = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const itemV = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] } },
};

const PERIOD_OPTIONS = [
  { value: 'current',  label: 'Current Month'  },
  { value: 'previous', label: 'Previous Month' },
  { value: 'custom',   label: 'Custom Range'   },
] as const;

// ── Sidebar filters ────────────────────────────────────────────────────────────
interface SidebarProps {
  timeRange: string; setTimeRange: (v: string) => void;
  customStartDate: string; setCustomStartDate: (v: string) => void;
  customEndDate: string; setCustomEndDate: (v: string) => void;
  rangeError: string | null;
}

const SidebarFilters: React.FC<SidebarProps> = ({
  timeRange, setTimeRange,
  customStartDate, setCustomStartDate,
  customEndDate, setCustomEndDate,
  rangeError,
}) => (
  <div className="space-y-5">
    <div>
      <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
        Time Period
      </label>
      <div className="space-y-1">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTimeRange(opt.value)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              timeRange === opt.value
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            {opt.label}
            {timeRange === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>

    <AnimatePresence>
      {timeRange === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">From</label>
              <input
                type="date" value={customStartDate} max={customEndDate || undefined}
                onChange={e => setCustomStartDate(e.target.value)}
                className={`w-full text-sm text-neutral-700 bg-neutral-50 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all ${rangeError ? 'border-red-300' : 'border-neutral-200'}`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">To</label>
              <input
                type="date" value={customEndDate} min={customStartDate || undefined}
                onChange={e => setCustomEndDate(e.target.value)}
                className={`w-full text-sm text-neutral-700 bg-neutral-50 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all ${rangeError ? 'border-red-300' : 'border-neutral-200'}`}
              />
            </div>
            {rangeError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />{rangeError}
              </motion.p>
            )}
            {(!customStartDate || !customEndDate) && !rangeError && (
              <p className="text-xs text-neutral-400">Select both dates to apply</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {timeRange !== 'custom' && (
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Active Window</p>
        <p className="text-xs font-medium text-neutral-700">
          {timeRange === 'current'
            ? `${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} – Today`
            : (() => {
                const now = new Date();
                const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const e = new Date(now.getFullYear(), now.getMonth(), 0);
                return `${s.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}`;
              })()
          }
        </p>
      </div>
    )}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const AnalyticsDashboard: React.FC = () => {
  const [lowStockProducts,   setLowStockProducts]   = useState<Product[]>([]);
  const [allStockProducts,   setAllStockProducts]   = useState<Product[]>([]);
  const [currentStats,       setCurrentStats]       = useState<PeriodStats>({ revenue: 0, orders: 0 });
  const [previousStats,      setPreviousStats]      = useState<PeriodStats>({ revenue: 0, orders: 0 });
  const [avgOrderValue,      setAvgOrderValue]      = useState(0);
  const [topSellingProducts, setTopSellingProducts] = useState<TopProduct[]>([]);
  const [latestOrders,       setLatestOrders]       = useState<Order[]>([]);
  const [showAllStock,       setShowAllStock]       = useState(false);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [rangeError,         setRangeError]         = useState<string | null>(null);
  const [sidebarOpen,        setSidebarOpen]        = useState(false);

  const [timeRange,       setTimeRange]       = useState('current');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate,   setCustomEndDate]   = useState('');

  const revenueChange = pctChange(currentStats.revenue, previousStats.revenue);
  const ordersChange  = pctChange(currentStats.orders,  previousStats.orders);
  const cmpLabel      = comparisonLabel(timeRange);

  useEffect(() => {
    if (timeRange !== 'custom' || !customStartDate || !customEndDate) { setRangeError(null); return; }
    setRangeError(new Date(customStartDate) > new Date(customEndDate) ? 'Start date must be before end date' : null);
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    const fetchData = async () => {
      const range = getDateRange(timeRange, customStartDate, customEndDate);
      if (!range) return;
      const prevRange   = getPreviousRange(range);
      const orderSelect = `*, order_items!inner(quantity, products!inner(name, price))`;
      setLoading(true); setError(null);
      try {
        const { data: allProducts, error: prodErr } = await supabase.from('products').select('id, name, stock, price');
        if (prodErr) throw prodErr;
        setAllStockProducts(allProducts ?? []);
        setLowStockProducts((allProducts ?? []).filter(p => p.stock < 5));

        const { data: currOrders, error: currErr } = await supabase.from('orders').select(orderSelect)
          .gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString())
          .order('created_at', { ascending: false });
        if (currErr) throw currErr;

        const { data: prevOrders, error: prevErr } = await supabase.from('orders').select(orderSelect)
          .gte('created_at', prevRange.start.toISOString()).lte('created_at', prevRange.end.toISOString());
        if (prevErr) throw prevErr;

        const currRevenue = (currOrders ?? []).reduce((a, o) => a + getOrderTotal(o.order_items), 0);
        const prevRevenue = (prevOrders  ?? []).reduce((a, o) => a + getOrderTotal(o.order_items), 0);
        setCurrentStats({ revenue: currRevenue, orders: currOrders?.length ?? 0 });
        setPreviousStats({ revenue: prevRevenue, orders: prevOrders?.length  ?? 0 });
        setAvgOrderValue(currOrders?.length ? currRevenue / currOrders.length : 0);

        const sales: Record<string, TopProduct> = {};
        (currOrders ?? []).forEach(order =>
          (order.order_items ?? []).forEach(item => {
            const name = item?.products?.name ?? 'Unknown';
            if (!sales[name]) sales[name] = { name, quantity: 0, revenue: 0 };
            sales[name].quantity += item.quantity ?? 0;
            sales[name].revenue  += (item.quantity ?? 0) * (item?.products?.price ?? 0);
          })
        );
        setTopSellingProducts(Object.values(sales).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
        setLatestOrders((currOrders ?? []).slice(0, 5));
      } catch (err) {
        setError('Failed to load analytics data. Please try again.'); console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, timeRange === 'custom' ? customStartDate : '', timeRange === 'custom' ? customEndDate : '']);

  const sidebarProps: SidebarProps = {
    timeRange, setTimeRange, customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate, rangeError,
  };
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === timeRange)?.label ?? 'This Period';

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <AdminLayout title="Analytics" subtitle="Business insights and performance metrics">
      <div className="flex gap-4 sm:gap-6">
        <div className="hidden lg:block w-60 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse space-y-3">
            <div className="w-24 h-2.5 bg-neutral-200 rounded-full" />
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="w-full h-10 bg-neutral-100 rounded-xl" />)}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* 2-col on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <SectionSkeleton /><SectionSkeleton />
          </div>
        </div>
      </div>
    </AdminLayout>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <AdminLayout title="Analytics" subtitle="Business insights and performance metrics">
      <div className="flex flex-col items-center gap-4 py-16 sm:py-20">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-700">Failed to load analytics</p>
          <p className="text-xs text-neutral-400 mt-1">{error}</p>
        </div>
        <button onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    </AdminLayout>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Analytics" subtitle="Business insights and performance metrics">

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
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-sm font-semibold text-neutral-900">Date Range</h3>
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
              <Calendar className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900">Date Range</h3>
            </div>
            <div className="p-4"><SidebarFilters {...sidebarProps} /></div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">

          {/* Mobile filter toggle */}
          <div className="flex items-center justify-between lg:hidden">
            <button onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors">
              <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
              {periodLabel}
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>

          {/* ── KPI stat cards — 2-col on mobile ──────────────────────────── */}
          <motion.div
            variants={listV} initial="hidden" animate="visible"
            className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4"
          >
            {/* Revenue */}
            <motion.div variants={itemV}
              className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <TrendBadge value={revenueChange} />
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight truncate">
                KES {fmt(currentStats.revenue)}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1 truncate">Revenue · {periodLabel}</p>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
                <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
                  {cmpLabel}: <span className="font-semibold text-neutral-600">KES {fmt(previousStats.revenue)}</span>
                </p>
              </div>
            </motion.div>

            {/* Orders */}
            <motion.div variants={itemV}
              className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
                </div>
                <TrendBadge value={ordersChange} />
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight">
                {currentStats.orders}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1 truncate">Orders · {periodLabel}</p>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
                <p className="text-[10px] sm:text-[11px] text-neutral-400">
                  {cmpLabel}: <span className="font-semibold text-neutral-600">{previousStats.orders} orders</span>
                </p>
              </div>
            </motion.div>

            {/* Avg order value */}
            <motion.div variants={itemV}
              className="bg-white rounded-xl border border-neutral-200 p-3.5 sm:p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                </div>
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight truncate">
                KES {fmt(avgOrderValue)}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1">Avg. order value</p>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
                <p className="text-[10px] sm:text-[11px] text-neutral-400">
                  Across <span className="font-semibold text-neutral-600">{currentStats.orders} orders</span>
                </p>
              </div>
            </motion.div>

            {/* Stock alerts */}
            <motion.div variants={itemV}
              className={`bg-white rounded-xl border p-3.5 sm:p-5 shadow-sm transition-all ${
                lowStockProducts.length > 0
                  ? 'border-amber-200 hover:border-amber-300 hover:shadow-amber-100/50 hover:shadow-md'
                  : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'
              }`}>
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                  lowStockProducts.length > 0 ? 'bg-amber-50' : 'bg-neutral-100'
                }`}>
                  <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${lowStockProducts.length > 0 ? 'text-amber-500' : 'text-neutral-400'}`} />
                </div>
                <button onClick={() => setShowAllStock(v => !v)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                  {showAllStock
                    ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
              <p className="text-base sm:text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-tight">
                {lowStockProducts.length}
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-400 mt-1">
                {lowStockProducts.length === 0 ? 'All stocked' : 'Need restocking'}
              </p>
              <AnimatePresence initial={false}>
                {showAllStock && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2 max-h-36 overflow-y-auto">
                      {(showAllStock ? allStockProducts : lowStockProducts).map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-neutral-600 truncate">{p.name}</span>
                          <span className={`text-xs font-semibold flex-shrink-0 tabular-nums ${p.stock < 5 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {p.stock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* ── Bottom sections ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

            {/* Top selling products */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">Top Selling Products</h2>
                  <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">By revenue · {periodLabel}</p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <Package2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500" />
                </div>
              </div>

              {topSellingProducts.length > 0 ? (
                <div className="p-2 sm:p-3 space-y-0.5">
                  {topSellingProducts.map((product, i) => {
                    const maxQty = topSellingProducts[0].quantity;
                    const pct    = maxQty > 0 ? (product.quantity / maxQty) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-2 sm:gap-3 px-2 py-2 sm:py-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${rankCls(i)}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1 sm:mb-1.5">
                            <p className="text-xs sm:text-sm font-medium text-neutral-800 truncate">{product.name}</p>
                            <p className="text-[11px] sm:text-xs font-semibold text-neutral-700 flex-shrink-0 tabular-nums">
                              KES {fmt(product.revenue)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.65, delay: 0.38 + i * 0.08, ease: 'easeOut' }}
                                className="h-full bg-neutral-800 rounded-full"
                              />
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-neutral-400 tabular-nums flex-shrink-0">
                              {product.quantity} units
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 sm:py-14">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 rounded-2xl flex items-center justify-center">
                    <Package2 className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-neutral-600">No sales data yet</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Rankings will appear once orders come in</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Latest orders */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">Latest Orders</h2>
                  <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">Most recent · {periodLabel}</p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500" />
                </div>
              </div>

              {latestOrders.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {latestOrders.map((order, i) => {
                    const total     = getOrderTotal(order.order_items);
                    const itemCount = (order.order_items ?? []).reduce((a, x) => a + x.quantity, 0);
                    const statusCls = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
                    const dotCls    = STATUS_DOT[order.status] ?? STATUS_DOT.pending;
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="flex items-center gap-2.5 sm:gap-4 px-3.5 sm:px-5 py-2.5 sm:py-3.5 hover:bg-neutral-50/80 transition-colors"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5">
                            {itemCount} item{itemCount !== 1 ? 's' : ''} · {new Date(order.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-neutral-900 tabular-nums whitespace-nowrap">
                          KES {fmt(total)}
                        </p>

                        {/* Full badge on sm+, dot on mobile */}
                        <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${statusCls}`}>
                          {order.status ?? 'pending'}
                        </span>
                        <span className={`sm:hidden w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 sm:py-14">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-neutral-600">No orders this period</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Try selecting a different time range</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsDashboard;

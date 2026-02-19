import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package2, Download, Search, Calendar, Filter,
  ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign,
  CheckCircle, Clock, AlertCircle, Truck, RefreshCcw,
  ChevronDown, ChevronUp, X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  quantity: number;
  price?: number;
  discount_amount?: number;
  product_id: string;
  products: { name: string; price: number } | null;
}
interface Payment   { payment_method: string }
interface Order {
  id: string;
  status: string;
  created_at: string;
  profiles: { email: string } | null;
  order_items: OrderItem[];
  payments: Payment[];
}
interface PeriodStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  totalRevenue: number;   // net (after discounts)
  grossRevenue: number;   // before discounts
  totalDiscount: number;
  averageOrder: number;
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

// ── Pure helpers ───────────────────────────────────────────────────────────────

/** Net line total for one item: (price − discount) × qty */
const itemNet = (item: OrderItem) => {
  const price    = item.products?.price ?? item.price ?? 0;
  const discount = item.discount_amount ?? 0;
  return (price - discount) * item.quantity;
};

/** Gross line total for one item: price × qty (no discount) */
const itemGross = (item: OrderItem) =>
  (item.products?.price ?? item.price ?? 0) * item.quantity;

/** Total discount for one item: discount × qty */
const itemDiscountTotal = (item: OrderItem) =>
  (item.discount_amount ?? 0) * item.quantity;

/** Net order total */
const calcOrderTotal = (items: OrderItem[]) =>
  (items ?? []).reduce((acc, i) => acc + itemNet(i), 0);

/** Derive PeriodStats from a list of orders */
const calcStats = (orders: Order[]): PeriodStats => {
  const init = { total: 0, pending: 0, processing: 0, completed: 0,
                 totalRevenue: 0, grossRevenue: 0, totalDiscount: 0 };
  const s = orders.reduce((acc, order) => {
    acc.total++;
    const key = order.status as 'pending' | 'processing' | 'completed';
    if (key in acc) acc[key]++;
    const items = order.order_items ?? [];
    acc.totalRevenue  += items.reduce((x, i) => x + itemNet(i), 0);
    acc.grossRevenue  += items.reduce((x, i) => x + itemGross(i), 0);
    acc.totalDiscount += items.reduce((x, i) => x + itemDiscountTotal(i), 0);
    return acc;
  }, init as typeof init & { pending: number; processing: number; completed: number });
  return { ...s, averageOrder: s.total > 0 ? s.totalRevenue / s.total : 0 };
};

/** Calendar-aware date ranges for the selected period */
const getDateRange = (period: ReportPeriod, startStr: string, endStr: string) => {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      return { start: s, end: now };
    }
    case 'weekly': {
      const s = new Date(now); s.setDate(now.getDate() - 6); s.setHours(0, 0, 0, 0);
      return { start: s, end: now };
    }
    case 'monthly':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'yearly':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'custom':
      if (startStr && endStr)
        return { start: new Date(startStr + 'T00:00:00'), end: new Date(endStr + 'T23:59:59') };
      return { start: now, end: now };
  }
};

/** Previous equivalent period — calendar-aware for month/year */
const getPrevDateRange = (period: ReportPeriod, cur: { start: Date; end: Date }) => {
  const { start, end } = cur;
  if (period === 'daily')
    return { start: new Date(start.getTime() - 86_400_000),
             end:   new Date(end.getTime()   - 86_400_000) };
  if (period === 'monthly') {
    const s = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const e = new Date(start.getTime() - 1);
    return { start: s, end: e };
  }
  if (period === 'yearly') {
    const s = new Date(start.getFullYear() - 1, 0, 1);
    const e = new Date(start.getTime() - 1);
    return { start: s, end: e };
  }
  // weekly / custom — same duration before current start
  const dur = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - dur - 1),
           end:   new Date(start.getTime() - 1) };
};

const pctChange = (curr: number, prev: number) =>
  prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

const fmt     = (n: number)   => Math.round(n).toLocaleString('en-KE');
const fmtExact = (n: number)  => n.toFixed(2);
const relDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
const relTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

// ── Shared sub-components ──────────────────────────────────────────────────────
const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-[3px] rounded-full text-[11px] font-semibold
      ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

const STATUS_CFG = {
  pending:    { label: 'Pending',    cls: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200/60',   Icon: Clock      },
  processing: { label: 'Processing', cls: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200/60',     Icon: RefreshCcw },
  completed:  { label: 'Completed',  cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', Icon: CheckCircle},
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50     text-red-600     ring-1 ring-red-200/60',     Icon: AlertCircle},
} as const;

const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 bg-neutral-200 rounded-xl" />
      <div className="w-20 h-5 bg-neutral-100 rounded-full" />
    </div>
    <div className="w-32 h-7 bg-neutral-200 rounded-lg mb-2" />
    <div className="w-24 h-3 bg-neutral-100 rounded-full" />
    <div className="mt-4 pt-3 border-t border-neutral-100">
      <div className="w-28 h-2.5 bg-neutral-100 rounded-full" />
    </div>
  </div>
);
const OrderSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="w-36 h-4 bg-neutral-200 rounded-full" />
        <div className="w-56 h-3 bg-neutral-100 rounded-full" />
        <div className="w-24 h-3 bg-neutral-100 rounded-full" />
      </div>
      <div className="w-28 h-8 bg-neutral-100 rounded-lg" />
    </div>
  </div>
);

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: 'Today', weekly: 'This Week', monthly: 'This Month',
  yearly: 'This Year', custom: 'Custom Range',
};

// ── Main Component ─────────────────────────────────────────────────────────────
const Orders = () => {
  const navigate = useNavigate();
  const user     = useStore((s) => s.user);

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

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
  }, [user, navigate]);

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
    } finally {
      setLoading(false);
    }
  };

  // ── Derived state (useMemo — no stale hardcoded values) ────────────────────
  const dateRange = useMemo(
    () => getDateRange(reportPeriod, customStartDate, customEndDate),
    [reportPeriod, customStartDate, customEndDate]
  );
  const prevRange = useMemo(
    () => getPrevDateRange(reportPeriod, dateRange),
    [reportPeriod, dateRange]
  );

  const periodOrders = useMemo(
    () => allOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    }),
    [allOrders, dateRange]
  );

  const prevPeriodOrders = useMemo(
    () => allOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= prevRange.start && d <= prevRange.end;
    }),
    [allOrders, prevRange]
  );

  const currStats = useMemo(() => calcStats(periodOrders),     [periodOrders]);
  const prevStats = useMemo(() => calcStats(prevPeriodOrders), [prevPeriodOrders]);

  // Real % changes — no more hardcoded +12%
  const ordersChange  = pctChange(currStats.total,        prevStats.total);
  const revenueChange = pctChange(currStats.totalRevenue, prevStats.totalRevenue);
  const avgChange     = pctChange(currStats.averageOrder, prevStats.averageOrder);

  const displayOrders = useMemo(
    () => periodOrders
      .filter(o => filter === 'all' || o.status === filter)
      .filter(o =>
        !searchTerm ||
        (o.profiles?.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [periodOrders, filter, searchTerm]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase.from('orders')
        .update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      // Update local state — no full refetch needed
      setAllOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
    } catch (err) {
      console.error('Error updating order:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpanded = (id: string) =>
    setExpandedOrders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── CSV report (fixed '\n' + accurate gross/net/discount) ─────────────────
  const downloadReport = () => {
    setIsExporting(true);
    try {
      const { start, end } = dateRange;
      const label = PERIOD_LABELS[reportPeriod];

      // Accumulate per-product and per-payment-method breakdowns
      const productSales: Record<string, {
        quantity: number; grossRevenue: number; discount: number; netRevenue: number; orders: Set<string>
      }> = {};
      const paymentBreakdown: Record<string, { count: number; gross: number; net: number }> = {};
      const statusBreakdown:  Record<string, { count: number; net: number }> = {};

      const totals = periodOrders.reduce((acc, order) => {
        const items    = order.order_items ?? [];
        const orderNet = calcOrderTotal(items);
        const orderGross   = items.reduce((s, i) => s + itemGross(i), 0);
        const orderDisc    = items.reduce((s, i) => s + itemDiscountTotal(i), 0);
        const orderQty     = items.reduce((s, i) => s + i.quantity, 0);

        acc.orders++;
        acc.net      += orderNet;
        acc.gross    += orderGross;
        acc.discount += orderDisc;
        acc.items    += orderQty;

        // Product breakdown
        items.forEach(item => {
          const name = item.products?.name ?? productNames[item.product_id] ?? item.product_id;
          if (!productSales[name])
            productSales[name] = { quantity: 0, grossRevenue: 0, discount: 0, netRevenue: 0, orders: new Set() };
          productSales[name].quantity     += item.quantity;
          productSales[name].grossRevenue += itemGross(item);
          productSales[name].discount     += itemDiscountTotal(item);
          productSales[name].netRevenue   += itemNet(item);
          productSales[name].orders.add(order.id);
        });

        // Payment breakdown
        const method = (order.payments?.[0]?.payment_method ?? 'Unknown').toUpperCase();
        if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, gross: 0, net: 0 };
        paymentBreakdown[method].count++;
        paymentBreakdown[method].gross += orderGross;
        paymentBreakdown[method].net   += orderNet;

        // Status breakdown
        const st = order.status.toUpperCase();
        if (!statusBreakdown[st]) statusBreakdown[st] = { count: 0, net: 0 };
        statusBreakdown[st].count++;
        statusBreakdown[st].net += orderNet;

        return acc;
      }, { orders: 0, net: 0, gross: 0, discount: 0, items: 0 });

      const lines = [
        'PENCHIC FARM - ORDER REPORT',
        `Period Label,${label}`,
        `Date Range,${start.toLocaleDateString('en-KE')} to ${end.toLocaleDateString('en-KE')}`,
        `Generated,${new Date().toLocaleString('en-KE')}`,
        `Generated By,${user?.email ?? 'Admin'}`,
        '',
        '=== ORDER DETAILS ===',
        'Order ID,Date,Time,Customer Email,Products,Qty per Product,Unit Prices (KES),Discounts per Unit (KES),Line Totals Net (KES),Order Gross (KES),Order Discount (KES),Order Net (KES),Payment Method,Status',
        ...periodOrders.map(order => {
          const items      = order.order_items ?? [];
          const orderNet   = calcOrderTotal(items);
          const orderGross = items.reduce((s, i) => s + itemGross(i), 0);
          const orderDisc  = items.reduce((s, i) => s + itemDiscountTotal(i), 0);
          const d          = new Date(order.created_at);
          return [
            order.id.slice(0, 8),
            d.toLocaleDateString('en-KE'),
            d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
            order.profiles?.email ?? 'N/A',
            '"' + items.map(i => i.products?.name ?? productNames[i.product_id] ?? i.product_id).join('; ') + '"',
            items.map(i => i.quantity).join('; '),
            items.map(i => fmtExact(i.products?.price ?? i.price ?? 0)).join('; '),
            items.map(i => fmtExact(i.discount_amount ?? 0)).join('; '),
            items.map(i => fmtExact(itemNet(i))).join('; '),
            fmtExact(orderGross),
            fmtExact(orderDisc),
            fmtExact(orderNet),
            (order.payments?.[0]?.payment_method ?? 'N/A').toUpperCase(),
            order.status.toUpperCase(),
          ].join(',');
        }),
        '',
        '=== SUMMARY STATISTICS ===',
        `Total Orders,${totals.orders}`,
        `Total Items Sold,${totals.items}`,
        `Gross Revenue (Before Discounts),${fmtExact(totals.gross)}`,
        `Total Discounts Applied,${fmtExact(totals.discount)}`,
        `Net Revenue (After Discounts),${fmtExact(totals.net)}`,
        `Discount Rate (%),${totals.gross > 0 ? ((totals.discount / totals.gross) * 100).toFixed(2) : '0.00'}`,
        `Average Order Value (Net),${totals.orders > 0 ? fmtExact(totals.net     / totals.orders) : '0.00'}`,
        `Average Items per Order,${totals.orders  > 0 ? (totals.items    / totals.orders).toFixed(2) : '0.00'}`,
        `Average Discount per Order,${totals.orders > 0 ? fmtExact(totals.discount / totals.orders) : '0.00'}`,
        '',
        '=== STATUS BREAKDOWN ===',
        'Status,Order Count,Net Revenue (KES)',
        ...Object.entries(statusBreakdown)
          .sort(([, a], [, b]) => b.count - a.count)
          .map(([s, d]) => `${s},${d.count},${fmtExact(d.net)}`),
        '',
        '=== PRODUCT BREAKDOWN ===',
        'Product Name,Units Sold,Gross Revenue (KES),Discounts Applied (KES),Net Revenue (KES),Discount Rate (%),Number of Orders',
        ...Object.entries(productSales)
          .sort(([, a], [, b]) => b.netRevenue - a.netRevenue)
          .map(([name, d]) => [
            `"${name}"`,
            d.quantity,
            fmtExact(d.grossRevenue),
            fmtExact(d.discount),
            fmtExact(d.netRevenue),
            d.grossRevenue > 0 ? ((d.discount / d.grossRevenue) * 100).toFixed(2) : '0.00',
            d.orders.size,
          ].join(',')),
        '',
        '=== PAYMENT METHOD BREAKDOWN ===',
        'Payment Method,Order Count,Gross Revenue (KES),Net Revenue (KES)',
        ...Object.entries(paymentBreakdown)
          .sort(([, a], [, b]) => b.net - a.net)
          .map(([m, d]) => `${m},${d.count},${fmtExact(d.gross)},${fmtExact(d.net)}`),
      ];

      // ✅ Fixed: '\n' not '\\n'
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `penchic-orders-${reportPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminLayout title="Orders" subtitle="Manage and track all orders">
        <div className="space-y-6">
          <div className="h-10 w-48 bg-neutral-200 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <OrderSkeleton key={i} />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const periodLabel = PERIOD_LABELS[reportPeriod];

  return (
    <AdminLayout title="Orders" subtitle="Manage and track all orders">
      <div className="space-y-6">

        {/* ── Top bar: period filter + export ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-sm">
              <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <select
                value={reportPeriod}
                onChange={e => setReportPeriod(e.target.value as ReportPeriod)}
                className="text-sm font-medium text-neutral-700 bg-transparent border-none outline-none pr-1 cursor-pointer"
              >
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="yearly">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <AnimatePresence>
              {reportPeriod === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 flex-wrap"
                >
                  {[
                    { val: customStartDate, set: setCustomStartDate },
                    { val: customEndDate,   set: setCustomEndDate   },
                  ].map(({ val, set }, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-xs text-neutral-400">to</span>}
                      <input
                        type="date" value={val} onChange={e => set(e.target.value)}
                        className="text-sm text-neutral-700 bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all"
                      />
                    </React.Fragment>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={downloadReport}
            disabled={isExporting || periodOrders.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex-shrink-0"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Exporting…' : `Export CSV (${periodOrders.length})`}
          </button>
        </div>

        {/* ── KPI cards with real % changes ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Orders */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                <Package2 className="w-5 h-5 text-sky-500" />
              </div>
              <TrendBadge value={ordersChange} />
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight tabular-nums">{currStats.total}</p>
            <p className="text-sm text-neutral-400 mt-1">Orders · {periodLabel}</p>
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <p className="text-[11px] text-neutral-400">
                Prior period: <span className="font-semibold text-neutral-600">{prevStats.total}</span>
              </p>
            </div>
          </div>

          {/* Net Revenue */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <TrendBadge value={revenueChange} />
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight tabular-nums">
              KES {fmt(currStats.totalRevenue)}
            </p>
            <p className="text-sm text-neutral-400 mt-1">Net revenue · {periodLabel}</p>
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <p className="text-[11px] text-neutral-400">
                Gross: <span className="font-semibold text-neutral-600">KES {fmt(currStats.grossRevenue)}</span>
                {' '}· Discounts: <span className="font-semibold text-emerald-600">−KES {fmt(currStats.totalDiscount)}</span>
              </p>
            </div>
          </div>

          {/* Avg order */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-500" />
              </div>
              <TrendBadge value={avgChange} />
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight tabular-nums">
              KES {fmt(currStats.averageOrder)}
            </p>
            <p className="text-sm text-neutral-400 mt-1">Avg. order (net) · {periodLabel}</p>
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <p className="text-[11px] text-neutral-400">
                Prior period: <span className="font-semibold text-neutral-600">KES {fmt(prevStats.averageOrder)}</span>
              </p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-neutral-300 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900 tracking-tight tabular-nums">{currStats.total}</p>
            <p className="text-sm text-neutral-400 mt-1">Status breakdown</p>
            <div className="mt-3 space-y-1.5">
              {([
                { key: 'pending',    label: 'Pending',    cls: 'text-amber-600'  },
                { key: 'processing', label: 'Processing', cls: 'text-sky-600'    },
                { key: 'completed',  label: 'Completed',  cls: 'text-emerald-600'},
              ] as const).map(({ key, label, cls }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${cls}`}>{label}</span>
                  <span className="text-xs font-bold text-neutral-700 tabular-nums">
                    {currStats[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Search + filter bar ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by email or order ID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 shadow-sm">
            <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-sm font-medium text-neutral-700 bg-transparent border-none outline-none py-2.5 pr-1 cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400 font-medium">
            <span className="text-neutral-700 font-semibold">{displayOrders.length}</span> order{displayOrders.length !== 1 ? 's' : ''} · {periodLabel}
          </p>
          {(searchTerm || filter !== 'all') && (
            <button
              onClick={() => { setFilter('all'); setSearchTerm(''); }}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── Orders list ──────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {displayOrders.map((order, idx) => {
            const total      = calcOrderTotal(order.order_items);
            const gross      = (order.order_items ?? []).reduce((s, i) => s + itemGross(i), 0);
            const disc       = (order.order_items ?? []).reduce((s, i) => s + itemDiscountTotal(i), 0);
            const expanded   = expandedOrders.has(order.id);
            const cfg        = STATUS_CFG[order.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
            const StatusIcon = cfg.Icon;
            const itemCount  = (order.order_items ?? []).reduce((a, i) => a + i.quantity, 0);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.035, 0.3), duration: 0.28 }}
                className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
              >
                {/* Order row header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-neutral-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {order.profiles?.email ?? 'N/A'} · {relDate(order.created_at)} at {relTime(order.created_at)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                      {disc > 0 && <span className="text-emerald-600"> · −KES {fmt(disc)} discount</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0 w-full sm:w-auto">
                    <p className="text-sm font-bold text-neutral-900 tabular-nums">
                      KES {fmt(total)}
                    </p>

                    {/* Colored status select */}
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                      className={[
                        'text-xs font-semibold border rounded-lg px-2 py-1.5',
                        'outline-none transition-all cursor-pointer disabled:opacity-50',
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

                    <button
                      onClick={() => toggleExpanded(order.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable item details */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-neutral-100 px-5 pt-3 pb-4 space-y-2">
                        {(order.order_items ?? []).map((item, i) => {
                          const price    = item.products?.price ?? item.price ?? 0;
                          const discount = item.discount_amount ?? 0;
                          const net      = itemNet(item);
                          const name     = item.products?.name ?? productNames[item.product_id] ?? item.product_id;

                          return (
                            <div key={item.id ?? i} className="flex items-center justify-between gap-4 py-1.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-6 h-6 bg-neutral-100 rounded-md flex items-center justify-center flex-shrink-0">
                                  <Package2 className="w-3.5 h-3.5 text-neutral-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-neutral-800 truncate">{name}</p>
                                  <p className="text-[11px] text-neutral-400">
                                    {item.quantity} × KES {fmt(price)}
                                    {discount > 0 && (
                                      <span className="text-emerald-600 ml-1">(−KES {fmt(discount)} each)</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {discount > 0 && (
                                  <p className="text-[11px] text-neutral-400 line-through tabular-nums">
                                    KES {fmt(price * item.quantity)}
                                  </p>
                                )}
                                <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                                  KES {fmt(net)}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        {/* Order totals footer */}
                        <div className="pt-3 mt-1 border-t border-neutral-100 space-y-1">
                          {disc > 0 && (
                            <div className="flex justify-between text-xs text-neutral-500">
                              <span>Gross subtotal</span>
                              <span className="tabular-nums">KES {fmt(gross)}</span>
                            </div>
                          )}
                          {disc > 0 && (
                            <div className="flex justify-between text-xs text-emerald-600">
                              <span>Discounts applied</span>
                              <span className="tabular-nums">−KES {fmt(disc)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-neutral-500">
                              Payment: <span className="font-semibold text-neutral-700">
                                {(order.payments?.[0]?.payment_method ?? 'N/A').toUpperCase()}
                              </span>
                            </p>
                            <p className="text-sm font-bold text-neutral-900 tabular-nums">
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

          {/* Empty state */}
          {displayOrders.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 bg-white rounded-xl border border-neutral-200">
              <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
                <Package2 className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-600">No orders found</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {searchTerm || filter !== 'all'
                    ? 'Try adjusting your filters'
                    : `No orders for ${periodLabel.toLowerCase()}`}
                </p>
              </div>
              {(searchTerm || filter !== 'all') && (
                <button
                  onClick={() => { setFilter('all'); setSearchTerm(''); }}
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-all"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Orders;

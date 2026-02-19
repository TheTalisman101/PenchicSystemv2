import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion } from 'framer-motion';
import {
  Package2,
  ShoppingCart,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OrderItem {
  quantity: number;
  products: { name: string; price: number } | null;
}
interface Order {
  id: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
  profiles: { email: string } | null;
}
interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockItems: number;
  recentOrders: Order[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const getOrderTotal = (items: OrderItem[]) =>
  items.reduce((acc, item) => acc + (item.products?.price ?? 0) * item.quantity, 0);

const AVATAR_PALETTE = [
  'bg-sky-100     text-sky-700',
  'bg-violet-100  text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100  text-orange-700',
  'bg-pink-100    text-pink-700',
  'bg-teal-100    text-teal-700',
];
const avatarColor = (email: string) =>
  AVATAR_PALETTE[(email?.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed:  { label: 'Completed',  cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70' },
  processing: { label: 'Processing', cls: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200/70'     },
  pending:    { label: 'Pending',    cls: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200/70'   },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50     text-red-600     ring-1 ring-red-200/70'     },
};

const relativeDate = (iso: string) => {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (diffH < 1)  return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)  return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
};

// ── Animation variants ─────────────────────────────────────────────────────────
const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] } },
};

// ── Skeleton components ────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
    <div className="flex items-start justify-between mb-5">
      <div className="w-10 h-10 bg-neutral-200 rounded-xl" />
      <div className="w-5 h-5 bg-neutral-100 rounded-md" />
    </div>
    <div className="w-28 h-7 bg-neutral-200 rounded-lg mb-2" />
    <div className="w-24 h-3 bg-neutral-100 rounded-full" />
    <div className="mt-4 pt-3 border-t border-neutral-100">
      <div className="w-16 h-2.5 bg-neutral-100 rounded-full" />
    </div>
  </div>
);

const OrderRowSkeleton = () => (
  <div className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
    <div className="w-9 h-9 bg-neutral-200 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="w-36 h-3 bg-neutral-200 rounded-full" />
      <div className="w-52 h-2.5 bg-neutral-100 rounded-full" />
    </div>
    <div className="w-20 h-4 bg-neutral-200 rounded-full" />
    <div className="hidden sm:block w-20 h-5 bg-neutral-100 rounded-full" />
  </div>
);

// ── Stat Card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  iconBg: string;
  urgent?: boolean;
  onAction?: () => void;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, icon, iconBg, urgent, onAction }) => (
  <motion.div
    variants={itemVariants}
    onClick={onAction}
    className={[
      'bg-white rounded-xl border p-5 shadow-sm',
      'transition-all duration-200 group',
      urgent
        ? 'border-amber-200 hover:border-amber-300 hover:shadow-amber-100/60 hover:shadow-md'
        : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md',
      onAction ? 'cursor-pointer' : '',
    ].join(' ')}
  >
    {/* Top row */}
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      {onAction && (
        <ArrowUpRight
          className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>

    {/* Value */}
    <p className="text-2xl font-bold text-neutral-900 tracking-tight tabular-nums leading-none">
      {value}
    </p>
    <p className="text-sm text-neutral-400 mt-1.5">{sublabel}</p>

    {/* Footer label */}
    <div className="mt-4 pt-3 border-t border-neutral-100">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
    </div>
  </motion.div>
);

// ── Dashboard ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate  = useNavigate();
  const user      = useStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState<Stats>({
    totalProducts: 0,
    totalOrders:   0,
    totalRevenue:  0,
    lowStockItems: 0,
    recentOrders:  [],
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase
          .from('orders')
          .select('*, order_items(quantity, products(name, price)), profiles(email)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (ordersRes.error)   throw ordersRes.error;

      const products = productsRes.data ?? [];
      const orders   = ordersRes.data   ?? [];

      setStats({
        totalProducts: products.length,
        totalOrders:   orders.length,
        totalRevenue:  orders.reduce((acc, o) => acc + getOrderTotal(o.order_items ?? []), 0),
        lowStockItems: products.filter(p => p.stock < 5).length,
        recentOrders:  orders,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Here's what's happening today">
      <div className="space-y-6">

        {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              label="Products"
              value={stats.totalProducts.toLocaleString()}
              sublabel="Across all categories"
              iconBg="bg-blue-50"
              icon={<Package2 className="w-5 h-5 text-blue-500" />}
              onAction={() => navigate('/admin/products')}
            />
            <StatCard
              label="Orders"
              value={stats.totalOrders.toLocaleString()}
              sublabel="Recent transactions"
              iconBg="bg-emerald-50"
              icon={<ShoppingCart className="w-5 h-5 text-emerald-500" />}
              onAction={() => navigate('/admin/orders')}
            />
            <StatCard
              label="Revenue"
              value={`KES ${stats.totalRevenue.toLocaleString('en-KE')}`}
              sublabel="Total earned"
              iconBg="bg-violet-50"
              icon={<DollarSign className="w-5 h-5 text-violet-500" />}
            />
            <StatCard
              label="Stock Alerts"
              value={String(stats.lowStockItems)}
              sublabel={stats.lowStockItems > 0 ? 'Items need restocking' : 'All items stocked'}
              iconBg={stats.lowStockItems > 0 ? 'bg-amber-50' : 'bg-neutral-100'}
              icon={
                <AlertCircle
                  className={`w-5 h-5 ${stats.lowStockItems > 0 ? 'text-amber-500' : 'text-neutral-400'}`}
                />
              }
              urgent={stats.lowStockItems > 0}
              onAction={stats.lowStockItems > 0 ? () => navigate('/admin/products') : undefined}
            />
          </motion.div>
        )}

        {/* ── Recent Orders ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
        >
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Recent Orders</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Last 5 placed orders</p>
            </div>
            <button
              onClick={() => navigate('/admin/orders')}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-800 transition-colors group"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="divide-y divide-neutral-100">
              {Array.from({ length: 3 }).map((_, i) => <OrderRowSkeleton key={i} />)}
            </div>
          ) : stats.recentOrders.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {stats.recentOrders.map((order, index) => {
                const total     = getOrderTotal(order.order_items ?? []);
                const email     = order.profiles?.email ?? 'unknown@';
                const status    = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
                const itemCount = (order.order_items ?? []).reduce((a, i) => a + i.quantity, 0);

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.32 + index * 0.05 }}
                    onClick={() => navigate('/admin/orders')}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Customer avatar */}
                    <div
                      className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold ${avatarColor(email)}`}
                    >
                      {email.charAt(0).toUpperCase()}
                    </div>

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <span className="hidden sm:block text-xs text-neutral-400 truncate">
                          {email}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {itemCount} item{itemCount !== 1 ? 's' : ''} · {relativeDate(order.created_at)}
                      </p>
                    </div>

                    {/* Amount */}
                    <p className="text-sm font-bold text-neutral-900 tabular-nums whitespace-nowrap">
                      KES {total.toLocaleString('en-KE')}
                    </p>

                    {/* Status badge */}
                    <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${status.cls}`}>
                      {status.label}
                    </span>

                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-600">No orders yet</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-[220px]">
                  Orders will appear here as soon as customers start purchasing
                </p>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </AdminLayout>
  );
};

export default Dashboard;

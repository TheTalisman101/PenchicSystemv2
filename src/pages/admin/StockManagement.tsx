import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Package2, TrendingUp, TrendingDown, AlertCircle,
  Search, Filter, Plus, Minus, X, CheckCircle, RefreshCw,
} from 'lucide-react';
import { useStore } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Toast { message: string; type: 'success' | 'error' }
type StockFilter = 'all' | 'out' | 'low' | 'medium' | 'high';

// ── Stock level config ─────────────────────────────────────────────────────────
const STOCK_CFG = {
  out:    { label: 'Out of Stock', badgeCls: 'bg-red-100/90    text-red-700',     barCls: 'bg-red-400',     valueCls: 'text-red-600'    },
  low:    { label: 'Low Stock',    badgeCls: 'bg-amber-100/90  text-amber-700',   barCls: 'bg-amber-400',   valueCls: 'text-amber-600'  },
  medium: { label: 'Med. Stock',   badgeCls: 'bg-orange-100/90 text-orange-700',  barCls: 'bg-orange-400',  valueCls: 'text-orange-600' },
  high:   { label: 'In Stock',     badgeCls: 'bg-emerald-100/90 text-emerald-700',barCls: 'bg-emerald-400', valueCls: 'text-emerald-600'},
} as const;
type StockLevel = keyof typeof STOCK_CFG;

const getLevel = (stock: number): StockLevel => {
  if (stock <= 0)  return 'out';
  if (stock <= 5)  return 'low';
  if (stock <= 20) return 'medium';
  return 'high';
};

// ── Product image with fallback ────────────────────────────────────────────────
const ProductImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-50">
        <Package2 className="w-10 h-10 text-neutral-200" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setErr(true)} className="w-full h-full object-cover" />;
};

// ── Skeletons ──────────────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
    <div className="w-9 h-9 bg-neutral-200 rounded-xl mb-3" />
    <div className="w-12 h-7 bg-neutral-200 rounded-lg mb-1.5" />
    <div className="w-24 h-3 bg-neutral-100 rounded-full" />
    <div className="mt-4 pt-3 border-t border-neutral-100 space-y-1.5">
      <div className="h-1 bg-neutral-100 rounded-full" />
      <div className="w-20 h-2.5 bg-neutral-100 rounded-full" />
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden animate-pulse">
    <div className="aspect-square bg-neutral-200" />
    <div className="p-4 space-y-2">
      <div className="w-16 h-3 bg-neutral-100 rounded-full" />
      <div className="w-3/4 h-4 bg-neutral-200 rounded-full" />
      <div className="mt-3 space-y-2">
        <div className="flex justify-between">
          <div className="w-16 h-2.5 bg-neutral-100 rounded-full" />
          <div className="w-14 h-2.5 bg-neutral-100 rounded-full" />
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full" />
        <div className="h-8 bg-neutral-100 rounded-lg mt-2" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-neutral-100 rounded-lg" />
          <div className="h-8 bg-neutral-100 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const StockManagement = () => {
  const navigate = useNavigate();
  const user     = useStore((s) => s.user);

  const [products,        setProducts]        = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [updatingId,      setUpdatingId]      = useState<string | null>(null);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [categoryFilter,  setCategoryFilter]  = useState('all');
  const [stockFilter,     setStockFilter]     = useState<StockFilter>('all');
  const [toast,           setToast]           = useState<Toast | null>(null);
  const [stockChanges,    setStockChanges]    = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) {
      navigate('/'); return;
    }
    fetchProducts();
  }, [user, navigate]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === 'error' ? 4000 : 3000);
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products').select('*').order('stock', { ascending: true });
      if (error) throw error;
      setProducts(data ?? []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load products', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleStockChange = (productId: string, value: string) =>
    setStockChanges(prev => ({ ...prev, [productId]: value }));

  const handleStockUpdate = async (productId: string, action: 'add' | 'remove') => {
    const qty = parseInt(stockChanges[productId]);
    if (isNaN(qty) || qty <= 0) {
      showToast('Enter a valid quantity (positive integer)', 'error');
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newStock = action === 'add' ? product.stock + qty : product.stock - qty;
    if (newStock < 0) {
      showToast(`Cannot remove more than the ${product.stock} available units`, 'error');
      return;
    }

    // Optimistic update — reflected immediately, no refetch needed [web:126]
    setUpdatingId(productId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));

    try {
      const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      if (error) {
        // Revert on failure
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: product.stock } : p));
        throw error;
      }
      setStockChanges(prev => ({ ...prev, [productId]: '' }));
      showToast(
        `${qty} unit${qty !== 1 ? 's' : ''} ${action === 'add' ? 'added to' : 'removed from'} ${product.name}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update stock', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const outCount    = products.filter(p => p.stock <= 0).length;
  const lowCount    = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const highCount   = products.filter(p => p.stock > 20).length;
  const pct         = (n: number) => products.length > 0 ? Math.round((n / products.length) * 100) : 0;

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch   = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const level           = getLevel(p.stock);
    const matchesStock    =
      stockFilter === 'all'    ? true               :
      stockFilter === 'out'    ? level === 'out'    :
      stockFilter === 'low'    ? level === 'low'    :
      stockFilter === 'medium' ? level === 'medium' :
                                  level === 'high';
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Bar fill is relative to the largest stock value (min 50) [web:123]
  const maxStock = Math.max(50, ...products.map(p => p.stock));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Stock Management" subtitle="Monitor and adjust your inventory levels">
      <div className="space-y-6">

        {/* ── Stat cards ────────────────────────────────────────────────────── */}
        {loadingProducts ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Products */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-neutral-300 transition-all">
              <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center mb-3">
                <Package2 className="w-4 h-4 text-sky-500" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 tabular-nums">{products.length}</p>
              <p className="text-xs text-neutral-400 mt-0.5 font-medium">Total Products</p>
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <p className="text-[11px] text-neutral-400">{highCount} well stocked</p>
              </div>
            </div>

            {/* Out of Stock */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-neutral-300 transition-all">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 tabular-nums">{outCount}</p>
              <p className="text-xs text-neutral-400 mt-0.5 font-medium">Out of Stock</p>
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${pct(outCount)}%` }} />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5">{pct(outCount)}% of inventory</p>
              </div>
            </div>

            {/* Low Stock */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-neutral-300 transition-all">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 tabular-nums">{lowCount}</p>
              <p className="text-xs text-neutral-400 mt-0.5 font-medium">Low Stock (≤5 units)</p>
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${pct(lowCount)}%` }} />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5">{pct(lowCount)}% of inventory</p>
              </div>
            </div>

            {/* Well Stocked */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:border-neutral-300 transition-all">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 tabular-nums">{highCount}</p>
              <p className="text-xs text-neutral-400 mt-0.5 font-medium">Well Stocked (&gt;20)</p>
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${pct(highCount)}%` }} />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5">{pct(highCount)}% of inventory</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text" placeholder="Search products…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category */}
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 shadow-sm">
            <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <select
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="text-sm font-medium text-neutral-700 bg-transparent border-none outline-none py-2.5 pr-1 cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Stock level */}
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 shadow-sm">
            <Package2 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <select
              value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)}
              className="text-sm font-medium text-neutral-700 bg-transparent border-none outline-none py-2.5 pr-1 cursor-pointer"
            >
              <option value="all">All levels</option>
              <option value="out">Out of Stock</option>
              <option value="low">Low Stock</option>
              <option value="medium">Medium Stock</option>
              <option value="high">Well Stocked</option>
            </select>
          </div>
        </div>

        {/* Results meta */}
        {!loadingProducts && (
          <div className="flex items-center justify-between -mt-2">
            <p className="text-xs text-neutral-400 font-medium">
              <span className="text-neutral-700 font-semibold">{filteredProducts.length}</span>
              {' '}of {products.length} product{products.length !== 1 ? 's' : ''}
            </p>
            {(searchTerm || categoryFilter !== 'all' || stockFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setStockFilter('all'); }}
                className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Products grid ──────────────────────────────────────────────────── */}
        {loadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product, idx) => {
              const level       = getLevel(product.stock);
              const { label, badgeCls, barCls, valueCls } = STOCK_CFG[level];
              const barWidth    = (product.stock / maxStock) * 100;
              const isUpdating  = updatingId === product.id;
              const qty         = stockChanges[product.id] ?? '';

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.35), duration: 0.28 }}
                  className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md hover:border-neutral-300 transition-all duration-200"
                >
                  {/* Image + badges ────────────────────────────────────────── */}
                  <div className="relative aspect-square overflow-hidden bg-neutral-100">
                    <ProductImage src={product.image_url} alt={product.name} />

                    {/* Stock badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm ${badgeCls}`}>
                        {label}
                      </span>
                    </div>

                    {/* Per-card updating overlay — no full-page spinner [web:126] */}
                    <AnimatePresence>
                      {isUpdating && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center"
                        >
                          <RefreshCw className="w-6 h-6 text-neutral-500 animate-spin" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Card body ──────────────────────────────────────────────── */}
                  <div className="p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      {product.category}
                    </span>
                    <h3 className="text-sm font-semibold text-neutral-900 truncate mt-0.5">
                      {product.name}
                    </h3>

                    {/* Animated stock bar [web:123][web:125] */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] text-neutral-400 font-medium">Stock level</span>
                        <span className={`text-sm font-bold tabular-nums ${valueCls}`}>
                          {product.stock} units
                        </span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
                          className={`h-full rounded-full ${barCls}`}
                        />
                      </div>
                    </div>

                    {/* Admin controls */}
                    {user?.role === 'admin' && (
                      <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                        <input
                          type="number" value={qty} min="1"
                          placeholder="Enter quantity"
                          disabled={isUpdating}
                          onChange={e => handleStockChange(product.id, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-800 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/[0.06] focus:border-neutral-300 transition-all disabled:opacity-50"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleStockUpdate(product.id, 'add')}
                            disabled={isUpdating || !qty}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-100 disabled:text-neutral-400 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </button>
                          <button
                            onClick={() => handleStockUpdate(product.id, 'remove')}
                            disabled={isUpdating || !qty || product.stock <= 0}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-neutral-100 disabled:text-neutral-400 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Worker view: read-only indicator */}
                    {user?.role === 'worker' && (
                      <div className="mt-3 pt-3 border-t border-neutral-100">
                        <p className="text-[11px] text-neutral-400 text-center">View only · contact admin to update</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-xl border border-neutral-200">
            <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <Package2 className="w-7 h-7 text-neutral-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-700">No products found</p>
              <p className="text-xs text-neutral-400 mt-1">Try adjusting your search or filters</p>
            </div>
            <button
              onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setStockFilter('all'); }}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-all"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

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

export default StockManagement;

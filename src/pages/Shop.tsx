import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import {
  ShoppingCart, Plus, Minus, Store, Search,
  SlidersHorizontal, X, Zap, Tag, CheckCircle,
  AlertCircle, ArrowRight, Leaf,
} from 'lucide-react';
import { useStore } from '../store';
import RecentlyViewed from '../components/RecentlyViewed';

/* ── Inline toast (no external dep needed) ─────────────────────── */
interface Toast { id: number; message: string; type: 'success' | 'error'; }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

function Toaster({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 16, background: '#fff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          border: `1px solid ${t.type === 'success' ? '#b7e4c7' : '#fca5a5'}`,
          borderLeft: `3px solid ${t.type === 'success' ? '#40916c' : '#ef4444'}`,
          minWidth: 260, maxWidth: 340,
          pointerEvents: 'all',
          animation: 'toastIn .28s cubic-bezier(0.16,1,0.3,1)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(12px) scale(.96) } to { opacity:1; transform:none } }`}</style>
          {t.type === 'success'
            ? <CheckCircle size={17} color="#40916c" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertCircle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2419', marginBottom: 2 }}>
              {t.type === 'success' ? 'Added to cart' : 'Error'}
            </div>
            <div style={{ fontSize: 12, color: '#6b8c77', lineHeight: 1.5 }}>{t.message}</div>
          </div>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0b8aa', padding: 2, display: 'flex', alignItems: 'center', borderRadius: 6 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function Shop() {
  const [products,          setProducts]          = useState<Product[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedCategory,  setSelectedCategory]  = useState('all');
  const [quantities,        setQuantities]        = useState<Record<string, number>>({});
  const [searchQuery,       setSearchQuery]       = useState('');
  const [showFilters,       setShowFilters]       = useState(false);
  const [sortBy,            setSortBy]            = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');
  const [stockFilter,       setStockFilter]       = useState<'all' | 'instock'>('all');
  const [error,             setError]             = useState('');

  const { toasts, add: addToast, remove: removeToast } = useToast();

  const addToCart = useStore(s => s.addToCart);
  const user      = useStore(s => s.user);
  const cart      = useStore(s => s.cart);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const canUseCart = user && ['admin', 'worker'].includes(user.role);
  const navigate = useNavigate();

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const now = new Date().toISOString();
      const { data: discounts } = await supabase
        .from('discounts').select('*').lte('start_date', now).gte('end_date', now);

      if (data) {
        const withDiscounts = data.map(p => ({
          ...p,
          discount: discounts?.find(d => d.product_id === p.id) || null,
        }));
        const initQty: Record<string, number> = {};
        withDiscounts.forEach(p => { initQty[p.id] = 1; });
        setQuantities(initQty);
        setProducts(withDiscounts);
      }
    } catch (err) {
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleQuantityChange = (productId: string, value: string | number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    let newQty = typeof value === 'string'
      ? (parseInt(value) || 1)
      : (quantities[productId] || 1) + value;
    newQty = Math.max(1, Math.min(newQty, product.stock));
    setQuantities(prev => ({ ...prev, [productId]: newQty }));
  };

  const handleQtyBlur = (productId: string, raw: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const clamped = Math.max(1, Math.min(parseInt(raw) || 1, product.stock));
    setQuantities(prev => ({ ...prev, [productId]: clamped }));
  };

  const handleAddToCart = (product: Product) => {
    if (!user) { navigate('/login'); return; }
    const quantity = quantities[product.id] || 1;
    if (quantity > product.stock) { addToast('Not enough stock available', 'error'); return; }
    addToCart({ product, quantity });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock - quantity } : p));
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    addToast(`${product.name} × ${quantity} added to cart`, 'success');
  };

  const formatPrice = (price: number) => `KES ${price.toLocaleString('en-KE')}`;
  const categories  = ['all', ...Array.from(new Set(products.map(p => p.category))).sort()];

  const filteredProducts = products
    .filter(p => {
      const q = searchQuery.toLowerCase();
      return (
        (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) &&
        (selectedCategory === 'all' || p.category === selectedCategory) &&
        (stockFilter === 'all' || p.stock > 0)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc')  return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name')       return a.name.localeCompare(b.name);
      return 0;
    });

  const hasActiveFilters = selectedCategory !== 'all' || stockFilter !== 'all' || sortBy !== 'default';

  const resetFilters = () => {
    setSelectedCategory('all');
    setStockFilter('all');
    setSortBy('default');
    setSearchQuery('');
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2.5px solid #d0ece1', borderTopColor: '#2d6a4f', animation: 'spin .7s linear infinite' }} />
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6b8c77', letterSpacing: 1 }}>Loading products…</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }
        .shop-root { min-height: 100vh; background: #f8faf9; font-family: 'DM Sans', sans-serif; color: #0d2419; }

        /* ── Header ── */
        .shop-header {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(16px);
          border-bottom: 1px solid #e8f2ec;
          box-shadow: 0 1px 12px rgba(13,36,25,0.06);
        }
        .shop-header-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 24px;
          height: 64px; display: flex; align-items: center; gap: 12px;
        }
        @media (min-width: 1024px) { .shop-header-inner { padding: 0 40px; } }

        .shop-brand {
          display: flex; align-items: center; gap: 9px; flex-shrink: 0;
          text-decoration: none;
        }
        .shop-brand-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(45,106,79,0.3);
        }
        .shop-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 17px; font-weight: 700; color: #0d2419;
          display: none;
        }
        @media (min-width: 640px) { .shop-brand-name { display: block; } }

        .shop-search-wrap { flex: 1; max-width: 480px; margin: 0 auto; position: relative; }
        .shop-search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #a0b8aa; pointer-events: none; }
        .shop-search {
          width: 100%; height: 40px; padding: 0 40px 0 40px;
          border: 1.5px solid #d4e8db; border-radius: 12px;
          background: #f8faf9; font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #0d2419; outline: none;
          transition: all 0.2s ease;
        }
        .shop-search::placeholder { color: #b7d0bf; }
        .shop-search:focus { border-color: #40916c; background: #fff; box-shadow: 0 0 0 4px rgba(64,145,108,0.1); }
        .shop-search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #a0b8aa; padding: 2px; display: flex; align-items: center; border-radius: 6px; transition: color .15s; }
        .shop-search-clear:hover { color: #2d6a4f; }

        .shop-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .hdr-btn {
          display: flex; align-items: center; gap: 6px;
          height: 38px; padding: 0 14px; border-radius: 11px;
          border: 1.5px solid #d4e8db; background: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: #4a7c5f; cursor: pointer; transition: all .2s ease;
          position: relative;
        }
        .hdr-btn:hover { border-color: #40916c; background: #f0f7f3; color: #2d6a4f; }
        .hdr-btn.active { border-color: #40916c; background: #eaf5f0; color: #2d6a4f; }
        .hdr-btn-label { display: none; }
        @media (min-width: 480px) { .hdr-btn-label { display: inline; } }
        .hdr-badge {
          position: absolute; top: -8px; right: -8px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #2d6a4f; color: #fff;
          font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(45,106,79,0.4);
          border: 2px solid #fff;
        }
        .filter-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ef4444; border: 1.5px solid #fff;
          position: absolute; top: -3px; right: -3px;
        }

        /* ── Filter bar ── */
        .filter-bar {
          border-top: 1px solid #e8f2ec; background: #fff;
          padding: 12px 24px;
        }
        @media (min-width: 1024px) { .filter-bar { padding: 12px 40px; } }
        .filter-bar-inner { max-width: 1280px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
        .filter-group { display: flex; align-items: center; gap: 8px; }
        .filter-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #a0b8aa; white-space: nowrap; }
        .filter-select {
          height: 34px; padding: 0 10px; border-radius: 9px;
          border: 1.5px solid #d4e8db; background: #f8faf9;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: #0d2419; outline: none; cursor: pointer; transition: border-color .2s;
        }
        .filter-select:focus { border-color: #40916c; }
        .filter-toggle { display: flex; border-radius: 9px; border: 1.5px solid #d4e8db; overflow: hidden; }
        .filter-toggle-btn {
          height: 34px; padding: 0 14px; background: #f8faf9;
          border: none; font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 600; color: #6b8c77;
          cursor: pointer; transition: all .15s ease;
        }
        .filter-toggle-btn.active { background: #2d6a4f; color: #fff; }
        .filter-toggle-btn:not(.active):hover { background: #f0f7f3; color: #2d6a4f; }
        .reset-btn {
          display: flex; align-items: center; gap: 5px;
          margin-left: auto; background: none; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          font-weight: 700; color: #ef4444; cursor: pointer;
          padding: 4px 8px; border-radius: 8px; transition: all .15s;
        }
        .reset-btn:hover { background: #fff5f5; }

        /* ── Page body ── */
        .shop-body { max-width: 1280px; margin: 0 auto; padding: 40px 24px 60px; }
        @media (min-width: 1024px) { .shop-body { padding: 40px 40px 60px; } }

        /* ── Error ── */
        .shop-error {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; background: #fff5f5;
          border: 1.5px solid #fca5a5; border-radius: 14px;
          font-size: 13px; font-weight: 500; color: #b91c1c;
          margin-bottom: 32px;
        }

        /* ── Section heading ── */
        .section-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .eyebrow-bar { width: 18px; height: 2px; background: #40916c; border-radius: 1px; }
        .eyebrow-text { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #40916c; }
        .section-h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(26px, 3vw, 36px); font-weight: 700;
          color: #0d2419; letter-spacing: -0.4px; line-height: 1.15;
        }

        /* ── Category pills ── */
        .cat-scroll {
          display: flex; gap: 8px;
          overflow-x: auto; padding-bottom: 4px;
          scrollbar-width: none; margin-bottom: 32px;
        }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-pill {
          flex-shrink: 0; padding: 8px 18px; border-radius: 100px;
          border: 1.5px solid #d4e8db; background: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: #6b8c77; cursor: pointer; transition: all .2s ease; white-space: nowrap;
        }
        .cat-pill:hover { border-color: #40916c; color: #2d6a4f; background: #f0f7f3; }
        .cat-pill.active { background: #2d6a4f; border-color: #2d6a4f; color: #fff; box-shadow: 0 4px 14px rgba(45,106,79,0.25); }

        /* ── Grid ── */
        .prod-grid {
          display: grid; gap: 20px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 540px)  { .prod-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 860px)  { .prod-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1200px) { .prod-grid { grid-template-columns: repeat(4, 1fr); } }

        /* ── Card ── */
        .prod-card {
          background: #fff; border: 1px solid #e2ede8;
          border-radius: 20px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: all .3s cubic-bezier(0.16,1,0.3,1);
        }
        .prod-card:hover {
          border-color: #b7e4c7;
          box-shadow: 0 16px 48px rgba(13,36,25,0.1);
          transform: translateY(-3px);
        }

        /* Image */
        .prod-img-wrap {
          position: relative; width: 100%;
          aspect-ratio: 4/3; overflow: hidden; background: #f0f7f3;
        }
        .prod-img {
          width: 100%; height: 100%; object-fit: cover;
          display: block; transition: transform .5s cubic-bezier(0.16,1,0.3,1);
        }
        .prod-card:hover .prod-img { transform: scale(1.06); }
        .prod-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(13,36,25,0.2), transparent);
          opacity: 0; transition: opacity .3s ease;
        }
        .prod-card:hover .prod-img-overlay { opacity: 1; }
        .prod-img-oos {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center;
        }
        .prod-oos-label {
          background: #ef4444; color: #fff;
          font-size: 11px; font-weight: 700; padding: 5px 12px;
          border-radius: 10px; letter-spacing: 0.5px;
        }
        .prod-badges {
          position: absolute; top: 12px; right: 12px;
          display: flex; flex-direction: column; align-items: flex-end; gap: 5px;
        }
        .badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700; padding: 4px 9px;
          border-radius: 8px; letter-spacing: 0.4px; line-height: 1;
        }
        .badge-cat  { background: rgba(13,36,25,0.75); color: #74c69d; backdrop-filter: blur(6px); text-transform: uppercase; letter-spacing: 1px; }
        .badge-disc { background: #ef4444; color: #fff; }
        .badge-low  { position: absolute; top: 12px; left: 12px; background: #f59e0b; color: #fff; }

        /* Quick view hint */
        .prod-quick {
          position: absolute; bottom: 0; left: 0; right: 0;
          display: flex; justify-content: center; padding-bottom: 14px;
          opacity: 0; transform: translateY(6px);
          transition: all .25s ease;
        }
        .prod-card:hover .prod-quick { opacity: 1; transform: translateY(0); }
        .prod-quick-inner {
          background: rgba(255,255,255,0.95);
          color: #0d2419; font-size: 12px; font-weight: 700;
          padding: 6px 14px; border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          display: flex; align-items: center; gap: 5px;
        }

        /* Body */
        .prod-body { padding: 18px; display: flex; flex-direction: column; flex: 1; gap: 12px; }
        .prod-name {
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 700; color: #0d2419;
          line-height: 1.3; text-decoration: none;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
          transition: color .15s;
        }
        .prod-name:hover { color: #2d6a4f; }
        .prod-desc {
          font-size: 12.5px; color: #6b8c77; line-height: 1.6;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          flex: 1;
        }

        /* Price row */
        .prod-price-row {
          display: flex; align-items: flex-end; justify-content: space-between;
          padding-top: 12px; border-top: 1px solid #f0f7f3;
        }
        .prod-price-original { font-size: 11px; color: #a0b8aa; text-decoration: line-through; line-height: 1; margin-bottom: 3px; }
        .prod-price-main { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #0d2419; letter-spacing: -0.3px; line-height: 1; }
        .prod-stock-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; padding: 4px 10px;
          border-radius: 8px;
        }
        .prod-stock-pill.in  { background: #d8f3dc; color: #1b4332; }
        .prod-stock-pill.out { background: #fee2e2; color: #991b1b; }
        .stock-dot { width: 5px; height: 5px; border-radius: 50%; }
        .stock-dot.in  { background: #40916c; }
        .stock-dot.out { background: #ef4444; }

        /* Qty stepper */
        .qty-stepper {
          display: flex; align-items: center; border-radius: 12px;
          border: 1.5px solid #d4e8db; overflow: hidden;
          transition: border-color .2s, box-shadow .2s;
        }
        .qty-stepper:focus-within { border-color: #40916c; box-shadow: 0 0 0 4px rgba(64,145,108,0.1); }
        .qty-btn {
          width: 36px; height: 38px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; color: #a0b8aa; cursor: pointer; transition: all .15s;
        }
        .qty-btn:hover:not(:disabled) { background: #f0f7f3; color: #2d6a4f; }
        .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .qty-input {
          flex: 1; height: 38px; text-align: center; border: none; background: transparent;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #0d2419;
          outline: none; appearance: textfield; -moz-appearance: textfield;
        }
        .qty-input::-webkit-outer-spin-button,
        .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }

        /* Add to cart btn */
        .cart-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px; border-radius: 12px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff; transition: all .22s ease;
          box-shadow: 0 4px 14px rgba(45,106,79,0.25), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .cart-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(45,106,79,0.35); }
        .cart-btn:active { transform: translateY(0); }

        /* Visit store btn */
        .store-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px; border-radius: 12px; border: 1.5px solid #b7e4c7; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700;
          background: #f0f7f3; color: #2d6a4f;
          transition: all .2s ease;
        }
        .store-btn:hover { background: #d8f3dc; border-color: #40916c; }

        /* Empty state */
        .empty-state {
          text-align: center; padding: 80px 24px;
          background: #fff; border-radius: 24px; border: 1px solid #e2ede8;
        }
        .empty-icon {
          width: 72px; height: 72px; border-radius: 20px;
          background: #f0f7f3; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .empty-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #0d2419; margin-bottom: 8px; }
        .empty-sub { font-size: 14px; color: #6b8c77; margin-bottom: 28px; }
        .empty-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; border-radius: 12px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700;
          background: linear-gradient(135deg, #40916c, #2d6a4f); color: #fff;
          box-shadow: 0 4px 14px rgba(45,106,79,0.25); transition: all .2s ease;
        }
        .empty-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(45,106,79,0.35); }

        /* Product count */
        .count-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
        .count-text { font-size: 13px; font-weight: 600; color: #a0b8aa; }
      `}</style>

      <div className="shop-root">

        {/* ══ STICKY HEADER ═════════════════════════════════════════════════ */}
        <header className="shop-header">
          <div className="shop-header-inner">
            {/* Brand */}
            <Link to="/" className="shop-brand">
              <div className="shop-brand-icon">
                <Leaf size={16} color="#fff" strokeWidth={1.8} />
              </div>
              <span className="shop-brand-name">Penchic Farm</span>
            </Link>

            {/* Search */}
            <div className="shop-search-wrap">
              <Search className="shop-search-icon" size={15} />
              <input
                type="text"
                className="shop-search"
                placeholder="Search products…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="shop-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="shop-header-actions">
              <button
                className={`hdr-btn ${showFilters || hasActiveFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(v => !v)}
              >
                <SlidersHorizontal size={15} />
                <span className="hdr-btn-label">Filters</span>
                {hasActiveFilters && <span className="filter-dot" />}
              </button>

              {canUseCart && (
                <button className="hdr-btn" onClick={() => navigate('/cart')}>
                  <ShoppingCart size={15} />
                  <span className="hdr-btn-label">Cart</span>
                  {cartCount > 0 && <span className="hdr-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
                </button>
              )}
            </div>
          </div>

          {/* ── Filter bar ── */}
          {showFilters && (
            <div className="filter-bar">
              <div className="filter-bar-inner">
                <div className="filter-group">
                  <span className="filter-label">Sort</span>
                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <option value="default">Default</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Stock</span>
                  <div className="filter-toggle">
                    {(['all', 'instock'] as const).map(v => (
                      <button
                        key={v}
                        className={`filter-toggle-btn ${stockFilter === v ? 'active' : ''}`}
                        onClick={() => setStockFilter(v)}
                      >
                        {v === 'all' ? 'All' : 'In Stock'}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button className="reset-btn" onClick={resetFilters}>
                    <X size={12} /> Reset all
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* ══ BODY ══════════════════════════════════════════════════════════ */}
        <div className="shop-body">

          {error && (
            <div className="shop-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Recently Viewed */}
          <RecentlyViewed />

          {/* Category pills */}
          {!searchQuery && (
            <div className="cat-scroll" style={{ marginTop: 32 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'All Products' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Section heading + count */}
          <div className="count-row" style={{ marginTop: searchQuery ? 32 : 0 }}>
            <div>
              {searchQuery ? (
                <h2 className="section-h2">
                  Results for <em style={{ color: '#2d6a4f', fontStyle: 'italic' }}>"{searchQuery}"</em>
                </h2>
              ) : (
                <>
                  <div className="section-eyebrow">
                    <div className="eyebrow-bar" />
                    <span className="eyebrow-text">
                      {selectedCategory === 'all' ? 'All Products' : selectedCategory}
                    </span>
                  </div>
                  <h2 className="section-h2">
                    {selectedCategory === 'all'
                      ? 'Browse Everything'
                      : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                  </h2>
                </>
              )}
            </div>
            <span className="count-text">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </span>
          </div>

          {/* ── Grid ── */}
          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Search size={32} color="#40916c" strokeWidth={1.5} />
              </div>
              <h3 className="empty-title">No products found</h3>
              <p className="empty-sub">Try adjusting your search or clearing your filters.</p>
              <button className="empty-btn" onClick={resetFilters}>
                Clear filters <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="prod-grid" style={{ marginTop: 20 }}>
              {filteredProducts.map(product => {
                const hasDiscount    = !!product.discount;
                const discountedPrice = hasDiscount
                  ? Math.round(product.price - (product.price * product.discount.percentage / 100))
                  : product.price;
                const inStock  = product.stock > 0;
                const lowStock = product.stock > 0 && product.stock <= 5;
                const qty      = quantities[product.id] || 1;

                return (
                  <article key={product.id} className="prod-card">

                    {/* Image */}
                    <Link to={`/product/${product.id}`} style={{ display: 'block', flexShrink: 0 }}>
                      <div className="prod-img-wrap">
                        <img src={product.image_url} alt={product.name} className="prod-img" loading="lazy" />
                        <div className="prod-img-overlay" />

                        {!inStock && (
                          <div className="prod-img-oos">
                            <span className="prod-oos-label">Out of Stock</span>
                          </div>
                        )}

                        <div className="prod-badges">
                          <span className="badge badge-cat">{product.category}</span>
                          {hasDiscount && (
                            <span className="badge badge-disc">
                              <Tag size={9} />-{product.discount.percentage}%
                            </span>
                          )}
                        </div>

                        {lowStock && (
                          <span className="badge badge-low" style={{ position: 'absolute', top: 12, left: 12 }}>
                            <Zap size={9} />{product.stock} left
                          </span>
                        )}

                        <div className="prod-quick">
                          <span className="prod-quick-inner">
                            View details <ArrowRight size={11} />
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Body */}
                    <div className="prod-body">
                      <Link to={`/product/${product.id}`} className="prod-name">{product.name}</Link>
                      <p className="prod-desc">{product.description}</p>

                      {/* Price + stock */}
                      <div className="prod-price-row">
                        <div>
                          {hasDiscount && (
                            <div className="prod-price-original">{`KES ${product.price.toLocaleString('en-KE')}`}</div>
                          )}
                          <div className="prod-price-main">{formatPrice(discountedPrice)}</div>
                        </div>
                        <span className={`prod-stock-pill ${inStock ? 'in' : 'out'}`}>
                          <span className={`stock-dot ${inStock ? 'in' : 'out'}`} />
                          {inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      {/* Staff: qty + add to cart */}
                      {canUseCart && inStock && (
                        <>
                          <div className="qty-stepper">
                            <button
                              className="qty-btn"
                              onClick={() => handleQuantityChange(product.id, -1)}
                              disabled={qty <= 1}
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number" min={1} max={product.stock}
                              value={qty} className="qty-input"
                              onChange={e => handleQuantityChange(product.id, e.target.value)}
                              onBlur={e => handleQtyBlur(product.id, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            />
                            <button
                              className="qty-btn"
                              onClick={() => handleQuantityChange(product.id, 1)}
                              disabled={qty >= product.stock}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <button className="cart-btn" onClick={() => handleAddToCart(product)}>
                            <ShoppingCart size={15} /> Add to Cart
                          </button>
                        </>
                      )}

                      {/* Guest/customer: visit store */}
                      {!canUseCart && inStock && (
                        <button
                          className="store-btn"
                          onClick={() => window.open('https://maps.google.com/?q=-1.1166,36.6333', '_blank')}
                        >
                          <Store size={15} /> Visit Shop
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Toasts ── */}
      <Toaster toasts={toasts} remove={removeToast} />
    </>
  );
}

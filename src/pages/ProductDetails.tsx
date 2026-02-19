import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import {
  ShoppingCart, Store, ChevronLeft, Tag, Sparkles,
  Plus, Minus, Percent, Leaf, CheckCircle, AlertCircle, X, ArrowRight,
} from 'lucide-react';
import { useStore } from '../store';
import { useInventoryVisibility } from '../hooks/useInventoryVisibility';

/* ── Inline toast ───────────────────────────────────────────────── */
interface Toast { id: number; message: string; type: 'success' | 'error'; }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

function Toaster({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 16, background: '#fff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: `1px solid ${t.type === 'success' ? '#b7e4c7' : '#fca5a5'}`,
          borderLeft: `3px solid ${t.type === 'success' ? '#40916c' : '#ef4444'}`,
          minWidth: 260, maxWidth: 340, pointerEvents: 'all',
          animation: 'toastIn .28s cubic-bezier(0.16,1,0.3,1)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {t.type === 'success'
            ? <CheckCircle size={17} color="#40916c" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertCircle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2419', marginBottom: 2 }}>
              {t.type === 'success' ? 'Added to cart' : 'Error'}
            </div>
            <div style={{ fontSize: 12, color: '#6b8c77', lineHeight: 1.5 }}>{t.message}</div>
          </div>
          <button onClick={() => remove(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#a0b8aa', padding: 2, display: 'flex', borderRadius: 6,
          }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
const ProductDetails = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { toasts, add: addToast, remove: removeToast } = useToast();

  const [product,         setProduct]         = useState<Product | null>(null);
  const [discount,        setDiscount]        = useState<any>(null);
  const [loading,         setLoading]         = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity,        setQuantity]        = useState(1);
  const [qtyDraft,        setQtyDraft]        = useState('1');
  const [addedToCart,     setAddedToCart]     = useState(false);

  const addToCart    = useStore(s => s.addToCart);
  const user         = useStore(s => s.user);
  const { canViewStock } = useInventoryVisibility(user?.role);
  const canUseCart   = user && ['admin', 'worker'].includes(user.role);

  /* ── Fetch ── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('products').select('*, product_variants(*)')
          .eq('id', id).single();
        if (error) throw error;
        setProduct(data);
        useStore.getState().addViewedProduct(data);

        const now = new Date().toISOString();
        const { data: disc } = await supabase
          .from('discounts').select('*')
          .eq('product_id', data.id)
          .lte('start_date', now).gte('end_date', now)
          .maybeSingle();
        setDiscount(disc || null);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── Discount ── */
  const hasDiscount     = !!discount && discount.percentage > 0;
  const originalPrice   = product?.price ?? 0;
  const discountedPrice = hasDiscount
    ? Math.round(originalPrice - (originalPrice * discount.percentage) / 100)
    : originalPrice;
  const savings = originalPrice - discountedPrice;

  /* ── Qty ── */
  const maxQty  = product?.stock ?? 999;
  const applyQty = (raw: number) => {
    const clamped = Math.max(1, Math.min(maxQty, isNaN(raw) ? 1 : raw));
    setQuantity(clamped);
    setQtyDraft(String(clamped));
  };

  /* ── Cart ── */
  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    if (!canUseCart) { addToast('Cart is only available to staff members.', 'error'); return; }
    if (!product) return;

    const variantData = selectedVariant
      ? product.product_variants?.find(v => v.id === selectedVariant)
      : null;

    if (quantity > (variantData?.stock ?? product.stock)) {
      addToast('Not enough stock available for this quantity.', 'error');
      return;
    }

    addToCart({ product: { ...product, discount: discount || null }, variant: variantData, quantity });
    setAddedToCart(true);
    addToast(`${product.name} × ${quantity} added to cart`, 'success');
    setTimeout(() => navigate('/cart'), 900);
  };

  /* ── Stock display ── */
  const getStockDisplay = (stock: number) => {
    if (canViewStock) {
      if (stock <= 0) return { text: `Out of Stock (0)`,            color: '#ef4444', dot: '#ef4444', pulse: false };
      if (stock <= 5) return { text: `Low Stock — only ${stock} left`, color: '#d97706', dot: '#f59e0b', pulse: true  };
      return           { text: `In Stock (${stock} available)`,     color: '#2d6a4f', dot: '#40916c', pulse: true  };
    }
    if (stock <= 0) return { text: 'Out of Stock', color: '#ef4444', dot: '#ef4444', pulse: false };
    return           { text: 'In Stock',       color: '#2d6a4f', dot: '#40916c', pulse: true  };
  };

  /* ── Loading / Not found ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2.5px solid #d0ece1', borderTopColor: '#2d6a4f', animation: 'spin .7s linear infinite' }} />
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#6b8c77', letterSpacing: 1 }}>Loading product…</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#6b8c77' }}>Product not found.</p>
    </div>
  );

  const stockDisplay = getStockDisplay(product.stock);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .pd-root { min-height: 100vh; background: #f8faf9; font-family: 'DM Sans', sans-serif; color: #0d2419; }

        /* ── Header ── */
        .pd-header {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(16px);
          border-bottom: 1px solid #e8f2ec;
          box-shadow: 0 1px 12px rgba(13,36,25,0.06);
        }
        .pd-header-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 24px;
          height: 64px; display: flex; align-items: center; gap: 12px;
        }
        @media (min-width: 1024px) { .pd-header-inner { padding: 0 40px; } }

        .pd-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 14px 0 10px; height: 38px; border-radius: 12px;
          border: 1.5px solid #d4e8db; background: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: #4a7c5f; cursor: pointer; transition: all .2s ease; flex-shrink: 0;
          text-decoration: none;
        }
        .pd-back:hover { border-color: #40916c; background: #f0f7f3; color: #2d6a4f; }

        .pd-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #a0b8aa; overflow: hidden;
        }
        .pd-breadcrumb a { color: #6b8c77; text-decoration: none; font-weight: 500; }
        .pd-breadcrumb a:hover { color: #2d6a4f; }
        .pd-breadcrumb-current {
          color: #0d2419; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Body ── */
        .pd-body { max-width: 1280px; margin: 0 auto; padding: 40px 24px 80px; }
        @media (min-width: 1024px) { .pd-body { padding: 40px 40px 80px; } }

        .pd-grid {
          display: grid; gap: 40px; align-items: start;
          grid-template-columns: 1fr;
        }
        @media (min-width: 960px) { .pd-grid { grid-template-columns: 1fr 1fr; gap: 60px; } }

        /* ── Image column ── */
        .pd-img-col { }
        @media (min-width: 960px) { .pd-img-col { position: sticky; top: 84px; } }

        .pd-img-frame {
          position: relative; aspect-ratio: 1/1;
          border-radius: 24px; overflow: hidden;
          background: #f0f7f3; border: 1px solid #e2ede8;
          box-shadow: 0 20px 64px rgba(13,36,25,0.1);
        }
        .pd-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform .7s cubic-bezier(0.16,1,0.3,1);
        }
        .pd-img-frame:hover .pd-img { transform: scale(1.04); }
        .pd-img-fade {
          position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
          background: linear-gradient(to top, rgba(13,36,25,0.18), transparent);
          border-radius: 0 0 24px 24px; pointer-events: none;
        }
        .pd-img-badges {
          position: absolute; top: 16px; right: 16px;
          display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
        }
        .pd-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; padding: 5px 11px;
          border-radius: 9px; letter-spacing: 0.5px; line-height: 1;
        }
        .pd-badge-cat  { background: rgba(13,36,25,0.75); color: #74c69d; backdrop-filter: blur(6px); text-transform: uppercase; letter-spacing: 1.2px; }
        .pd-badge-disc { background: #ef4444; color: #fff; }

        /* ── Info column ── */
        .pd-info { display: flex; flex-direction: column; gap: 28px; }

        .pd-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 42px); font-weight: 700;
          color: #0d2419; line-height: 1.1; letter-spacing: -0.5px; margin-bottom: 12px;
        }
        .pd-desc { font-size: 15px; color: #6b8c77; line-height: 1.75; }

        /* Price card */
        .pd-price-card {
          background: #fff; border: 1px solid #e2ede8;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 4px 24px rgba(13,36,25,0.06);
        }
        .pd-discount-banner {
          background: linear-gradient(135deg, #ef4444, #e11d48);
          padding: 14px 20px; display: flex; align-items: center; gap: 14px;
        }
        .pd-discount-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .pd-discount-label { font-size: 13px; font-weight: 700; color: #fff; line-height: 1.3; }
        .pd-discount-sub   { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 2px; }
        .pd-discount-pill  { margin-left: auto; background: rgba(255,255,255,0.2); color: #fff; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 8px; letter-spacing: 0.5px; flex-shrink: 0; }

        .pd-price-body { padding: 20px; }

        .pd-price-main    { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 700; color: #0d2419; letter-spacing: -1px; line-height: 1; }
        .pd-price-orig    { font-size: 16px; color: #a0b8aa; text-decoration: line-through; margin-left: 10px; font-weight: 400; }
        .pd-price-tags    { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .pd-price-tag     { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9px; }
        .pd-price-tag-red { background: #fff5f5; border: 1px solid #fca5a5; color: #b91c1c; }
        .pd-price-tag-grn { background: #f0f7f3; border: 1px solid #b7e4c7; color: #2d6a4f; }

        .pd-stock-row {
          display: flex; align-items: center; gap: 9px;
          padding-top: 16px; margin-top: 16px; border-top: 1px solid #f0f7f3;
        }
        .pd-stock-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; position: relative; }
        .pd-stock-dot-ping {
          position: absolute; inset: 0; border-radius: 50%;
          animation: ping 1.4s cubic-bezier(0,0,0.2,1) infinite;
          opacity: 0.5;
        }
        @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
        .pd-stock-text { font-size: 13px; font-weight: 600; }

        /* Variants */
        .pd-section-label { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #a0b8aa; margin-bottom: 12px; }
        .pd-variant-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .pd-variant-btn {
          padding: 9px 20px; border-radius: 12px; border: 1.5px solid #d4e8db;
          background: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 700; color: #4a7c5f;
          cursor: pointer; transition: all .2s ease;
        }
        .pd-variant-btn:hover:not(:disabled) { border-color: #40916c; color: #2d6a4f; background: #f0f7f3; }
        .pd-variant-btn.active { background: #2d6a4f; border-color: #2d6a4f; color: #fff; box-shadow: 0 4px 14px rgba(45,106,79,0.25); }
        .pd-variant-btn:disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }

        /* Qty stepper */
        .pd-qty-row { display: flex; align-items: center; gap: 16px; }
        .pd-qty-stepper {
          display: inline-flex; align-items: center;
          border: 1.5px solid #d4e8db; border-radius: 14px;
          overflow: hidden; transition: border-color .2s, box-shadow .2s; background: #fff;
        }
        .pd-qty-stepper:focus-within { border-color: #40916c; box-shadow: 0 0 0 4px rgba(64,145,108,0.1); }
        .pd-qty-btn {
          width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; color: #a0b8aa; cursor: pointer; transition: all .15s;
        }
        .pd-qty-btn:hover:not(:disabled) { background: #f0f7f3; color: #2d6a4f; }
        .pd-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pd-qty-input {
          width: 56px; height: 44px; text-align: center; border: none; background: transparent;
          font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700;
          color: #0d2419; outline: none; appearance: textfield; -moz-appearance: textfield;
        }
        .pd-qty-input::-webkit-outer-spin-button,
        .pd-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .pd-qty-hint { font-size: 12px; color: #a0b8aa; font-weight: 500; }

        /* Total preview */
        .pd-total-preview {
          background: #f0f7f3; border: 1.5px solid #b7e4c7;
          border-radius: 14px; padding: 14px 18px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .pd-total-label { font-size: 13px; font-weight: 600; color: #2d6a4f; }
        .pd-total-amount { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #2d6a4f; letter-spacing: -0.3px; text-align: right; }
        .pd-total-saving { font-size: 11px; color: #40916c; font-weight: 600; }

        /* CTA */
        .pd-cta {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 15px; border-radius: 16px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700;
          transition: all .25s ease;
        }
        .pd-cta-primary {
          background: linear-gradient(135deg, #40916c, #1b4332);
          color: #fff;
          box-shadow: 0 6px 24px rgba(45,106,79,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .pd-cta-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(45,106,79,0.4); }
        .pd-cta-primary:active:not(:disabled) { transform: translateY(0); }
        .pd-cta-primary:disabled { background: #d4e8db; color: #a0b8aa; cursor: not-allowed; box-shadow: none; }
        .pd-cta-added { background: #d8f3dc; color: #2d6a4f; cursor: default; box-shadow: none; }

        /* Guest/customer cards */
        .pd-visit-card {
          position: relative; overflow: hidden;
          background: #f0f7f3; border: 1.5px solid #b7e4c7;
          border-radius: 20px; padding: 28px; text-align: center;
        }
        .pd-visit-card-orb {
          position: absolute; width: 120px; height: 120px; border-radius: 50%;
          background: #40916c; opacity: 0.06; pointer-events: none;
        }
        .pd-visit-text { font-size: 14px; font-weight: 600; color: #2d6a4f; margin-bottom: 18px; line-height: 1.6; }
        .pd-visit-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #40916c, #2d6a4f);
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 16px rgba(45,106,79,0.28);
          transition: all .2s ease;
        }
        .pd-visit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(45,106,79,0.38); }
      `}</style>

      <div className="pd-root">

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <header className="pd-header">
          <div className="pd-header-inner">
            <button className="pd-back" onClick={() => navigate(-1)}>
              <ChevronLeft size={15} /> Back
            </button>
            <div className="pd-breadcrumb">
              <Link to="/shop">Shop</Link>
              <span>/</span>
              <span style={{ textTransform: 'capitalize' }}>{product.category}</span>
              <span>/</span>
              <span className="pd-breadcrumb-current">{product.name}</span>
            </div>
          </div>
        </header>

        {/* ══ BODY ══════════════════════════════════════════════════════════ */}
        <main className="pd-body">
          <div className="pd-grid">

            {/* ── Image ── */}
            <div className="pd-img-col">
              <div className="pd-img-frame">
                <img src={product.image_url} alt={product.name} className="pd-img" />
                <div className="pd-img-fade" />
                <div className="pd-img-badges">
                  <span className="pd-badge pd-badge-cat">{product.category}</span>
                  {hasDiscount && (
                    <span className="pd-badge pd-badge-disc">
                      <Tag size={9} />{discount.percentage}% OFF
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Info ── */}
            <div className="pd-info">

              {/* Title + description */}
              <div>
                <h1 className="pd-title">{product.name}</h1>
                <p className="pd-desc">{product.description}</p>
              </div>

              {/* Price card */}
              <div className="pd-price-card">
                {hasDiscount && (
                  <div className="pd-discount-banner">
                    <div className="pd-discount-icon">
                      <Percent size={16} color="#fff" />
                    </div>
                    <div>
                      <div className="pd-discount-label">{discount.percentage}% OFF — Special Offer</div>
                      <div className="pd-discount-sub">Save KES {savings.toLocaleString('en-KE')} per unit</div>
                    </div>
                    <span className="pd-discount-pill">LIMITED</span>
                  </div>
                )}
                <div className="pd-price-body">
                  <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                    <span className="pd-price-main">KES {discountedPrice.toLocaleString('en-KE')}</span>
                    {hasDiscount && (
                      <span className="pd-price-orig">KES {originalPrice.toLocaleString('en-KE')}</span>
                    )}
                  </div>
                  {hasDiscount && (
                    <div className="pd-price-tags">
                      <span className="pd-price-tag pd-price-tag-red">
                        <Tag size={10} />Save KES {savings.toLocaleString('en-KE')}
                      </span>
                      <span className="pd-price-tag pd-price-tag-grn">
                        <Sparkles size={10} />{discount.percentage}% discount applied
                      </span>
                    </div>
                  )}

                  {/* Stock */}
                  <div className="pd-stock-row">
                    <div className="pd-stock-dot" style={{ background: stockDisplay.dot }}>
                      {stockDisplay.pulse && (
                        <span className="pd-stock-dot-ping" style={{ background: stockDisplay.dot }} />
                      )}
                    </div>
                    <span className="pd-stock-text" style={{ color: stockDisplay.color }}>
                      {stockDisplay.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variants */}
              {product.product_variants && product.product_variants.length > 0 && (
                <div>
                  <div className="pd-section-label">Select Size</div>
                  <div className="pd-variant-grid">
                    {product.product_variants.map(v => (
                      <button
                        key={v.id}
                        className={`pd-variant-btn ${selectedVariant === v.id ? 'active' : ''}`}
                        onClick={() => setSelectedVariant(v.id)}
                        disabled={v.stock <= 0}
                      >
                        {v.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Staff: qty + CTA ── */}
              {canUseCart ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div className="pd-section-label">Quantity</div>
                    <div className="pd-qty-row">
                      <div className="pd-qty-stepper">
                        <button className="pd-qty-btn" onClick={() => applyQty(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease">
                          <Minus size={15} />
                        </button>
                        <input
                          type="number" min={1} max={maxQty}
                          value={qtyDraft} className="pd-qty-input"
                          onChange={e => setQtyDraft(e.target.value)}
                          onBlur={() => applyQty(parseInt(qtyDraft, 10))}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                        <button className="pd-qty-btn" onClick={() => applyQty(quantity + 1)} disabled={quantity >= maxQty} aria-label="Increase">
                          <Plus size={15} />
                        </button>
                      </div>
                      {product.stock > 0 && (
                        <span className="pd-qty-hint">
                          {product.stock} unit{product.stock !== 1 ? 's' : ''} available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total preview */}
                  {hasDiscount && quantity > 1 && (
                    <div className="pd-total-preview">
                      <span className="pd-total-label">Total for {quantity} units</span>
                      <div>
                        <div className="pd-total-amount">KES {(discountedPrice * quantity).toLocaleString('en-KE')}</div>
                        <div className="pd-total-saving">Save KES {(savings * quantity).toLocaleString('en-KE')} total</div>
                      </div>
                    </div>
                  )}

                  {/* Add to cart */}
                  <button
                    className={`pd-cta ${addedToCart ? 'pd-cta-added' : 'pd-cta-primary'}`}
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0 || addedToCart}
                  >
                    {addedToCart ? (
                      <><CheckCircle size={17} /> Added — redirecting…</>
                    ) : product.stock > 0 ? (
                      <>
                        <ShoppingCart size={17} />
                        {hasDiscount
                          ? `Add to Cart — KES ${discountedPrice.toLocaleString('en-KE')}`
                          : 'Add to Cart'}
                        <ArrowRight size={15} />
                      </>
                    ) : (
                      'Out of Stock'
                    )}
                  </button>
                </div>
              ) : (
                /* Guest / customer */
                <div className="pd-visit-card">
                  <div className="pd-visit-card-orb" style={{ top: -40, right: -40 }} />
                  <div className="pd-visit-card-orb" style={{ bottom: -40, left: -40 }} />
                  <p className="pd-visit-text">
                    {!user
                      ? 'Online shopping is not available yet, to purchase this item visit us in-store.'
                      : 'Visit us in-store to purchase this item.'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {!user && (
                      <button className="pd-visit-btn" onClick={() => navigate('/login')}>
                        <Leaf size={15} /> Sign in
                      </button>
                    )}
                    <button
                      className="pd-visit-btn"
                      style={!user ? { background: '#fff', color: '#2d6a4f', border: '1.5px solid #b7e4c7', boxShadow: 'none' } : undefined}
                      onClick={() => window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank')}
                    >
                      <Store size={15} /> Get Directions
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      <Toaster toasts={toasts} remove={removeToast} />
    </>
  );
};

export default ProductDetails;

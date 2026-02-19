import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import {
  ShoppingCart, Store, ChevronLeft, Tag, Sparkles,
  Plus, Minus, Percent, Leaf, CheckCircle, AlertCircle, X, ArrowRight,
} from 'lucide-react';
import { useStore } from '../store';
import { useInventoryVisibility } from '../hooks/useInventoryVisibility';

// ── Toast ──────────────────────────────────────────────────────────────────────
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

// Portaled to document.body — escapes any backdrop-filter containing block
function Toaster({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  if (typeof document === 'undefined' || !toasts.length) return null;
  return ReactDOM.createPortal(
    <>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2 sm:gap-2.5 pointer-events-none pb-[env(safe-area-inset-bottom)]">
        {toasts.map(t => (
          <div
            key={t.id}
            style={{ animation: 'toastIn .28s cubic-bezier(0.16,1,0.3,1)', fontFamily: "'DM Sans',sans-serif" }}
            className={`
              flex items-start gap-3 pointer-events-auto
              p-3 sm:p-3.5 rounded-2xl bg-white
              shadow-[0_8px_32px_rgba(0,0,0,0.12)]
              border border-l-[3px]
              min-w-[220px] max-w-[300px] sm:min-w-[260px] sm:max-w-[340px]
              ${t.type === 'success' ? 'border-[#b7e4c7] border-l-[#40916c]' : 'border-[#fca5a5] border-l-[#ef4444]'}
            `}
          >
            {t.type === 'success'
              ? <CheckCircle size={16} color="#40916c" className="flex-shrink-0 mt-px" />
              : <AlertCircle size={16} color="#ef4444" className="flex-shrink-0 mt-px" />}
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] sm:text-[13px] font-bold text-[#0d2419] mb-0.5">
                {t.type === 'success' ? 'Added to cart' : 'Error'}
              </div>
              <div className="text-[11.5px] sm:text-[12px] text-[#6b8c77] leading-[1.5]">{t.message}</div>
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-[#a0b8aa] hover:text-[#4a7c5f] active:text-[#2d6a4f] p-0.5 rounded-md transition-colors flex-shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </>,
    document.body
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
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

  const addToCart  = useStore(s => s.addToCart);
  const user       = useStore(s => s.user);
  const { canViewStock } = useInventoryVisibility(user?.role);
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  // ── Fetch ────────────────────────────────────────────────────────────────────
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

  // ── Discount ─────────────────────────────────────────────────────────────────
  const hasDiscount     = !!discount && discount.percentage > 0;
  const originalPrice   = product?.price ?? 0;
  const discountedPrice = hasDiscount
    ? Math.round(originalPrice - (originalPrice * discount.percentage) / 100)
    : originalPrice;
  const savings = originalPrice - discountedPrice;

  // ── Qty ──────────────────────────────────────────────────────────────────────
  const maxQty = product?.stock ?? 999;
  const applyQty = (raw: number) => {
    const clamped = Math.max(1, Math.min(maxQty, isNaN(raw) ? 1 : raw));
    setQuantity(clamped);
    setQtyDraft(String(clamped));
  };

  // ── Cart ─────────────────────────────────────────────────────────────────────
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

  // ── Stock display — returns Tailwind class strings ────────────────────────────
  const getStockDisplay = (stock: number) => {
    if (canViewStock) {
      if (stock <= 0) return { text: `Out of Stock (0)`,              color: 'text-red-500',   dot: 'bg-red-500',    pulse: false };
      if (stock <= 5) return { text: `Low Stock — only ${stock} left`, color: 'text-amber-600', dot: 'bg-amber-400',  pulse: true  };
      return           { text: `In Stock (${stock} available)`,       color: 'text-[#2d6a4f]', dot: 'bg-[#40916c]', pulse: true  };
    }
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500',   dot: 'bg-red-500',    pulse: false };
    return           { text: 'In Stock',       color: 'text-[#2d6a4f]', dot: 'bg-[#40916c]', pulse: true  };
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3.5">
        <div className="w-11 h-11 rounded-full border-[2.5px] border-[#d0ece1] border-t-[#2d6a4f] animate-spin" />
        <p className="text-[13px] text-[#6b8c77] tracking-wide" style={{ fontFamily: "'DM Sans',sans-serif" }}>
          Loading product…
        </p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
      <p className="text-[#6b8c77]" style={{ fontFamily: "'DM Sans',sans-serif" }}>Product not found.</p>
    </div>
  );

  const stockDisplay = getStockDisplay(product.stock);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        .pd-img-hover:hover .pd-img { transform: scale(1.04); }
        .pd-qty-input::-webkit-outer-spin-button,
        .pd-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .pd-qty-input { -moz-appearance: textfield; }
      `}</style>

      <div className="min-h-screen bg-[#f8faf9] text-[#0d2419]" style={{ fontFamily: "'DM Sans',sans-serif" }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="
          sticky top-0 z-40
          bg-white/[0.92] backdrop-blur-[16px]
          border-b border-[#e8f2ec]
          shadow-[0_1px_12px_rgba(13,36,25,0.06)]
        ">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 h-14 sm:h-16 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(-1)}
              className="
                inline-flex items-center gap-1.5 sm:gap-2
                pl-2 sm:pl-2.5 pr-3 sm:pr-3.5 h-9 sm:h-[38px] min-w-[72px]
                rounded-xl border-[1.5px] border-[#d4e8db] bg-white
                text-[12px] sm:text-[13px] font-semibold text-[#4a7c5f]
                flex-shrink-0 transition-all duration-200
                hover:border-[#40916c] hover:bg-[#f0f7f3] hover:text-[#2d6a4f]
                active:scale-[0.97] active:bg-[#e8f2ec]
              "
            >
              <ChevronLeft size={14} /> Back
            </button>

            {/* Breadcrumb — category segment hidden on mobile */}
            <nav className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-[12px] text-[#a0b8aa] overflow-hidden min-w-0">
              <Link to="/shop" className="text-[#6b8c77] font-medium hover:text-[#2d6a4f] transition-colors flex-shrink-0">
                Shop
              </Link>
              <span className="flex-shrink-0">/</span>
              <span className="capitalize hidden sm:inline flex-shrink-0 text-[#6b8c77] font-medium">
                {product.category}
              </span>
              <span className="hidden sm:inline flex-shrink-0">/</span>
              <span className="font-semibold text-[#0d2419] truncate">{product.name}</span>
            </nav>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <main className="max-w-[1280px] mx-auto px-4 pt-5 pb-16 sm:px-6 sm:pt-10 sm:pb-20 lg:px-10">
          <div className="grid grid-cols-1 gap-5 sm:gap-10 lg:grid-cols-2 lg:gap-[60px] items-start">

            {/* ── Image ──────────────────────────────────────────────────────── */}
            <div className="lg:sticky lg:top-[84px]">
              <div className="pd-img-hover relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-[#f0f7f3] border border-[#e2ede8] shadow-[0_8px_32px_rgba(13,36,25,0.08)] sm:shadow-[0_20px_64px_rgba(13,36,25,0.1)]">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="pd-img w-full h-full object-cover block transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
                <div className="absolute bottom-0 inset-x-0 h-24 sm:h-32 bg-gradient-to-t from-[rgba(13,36,25,0.18)] to-transparent rounded-b-2xl sm:rounded-b-3xl pointer-events-none" />
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-1 sm:py-[5px] rounded-[7px] sm:rounded-[9px] bg-[rgba(13,36,25,0.75)] text-[#74c69d] backdrop-blur-[6px] uppercase tracking-[1.2px]">
                    {product.category}
                  </span>
                  {hasDiscount && (
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-1 sm:py-[5px] rounded-[7px] sm:rounded-[9px] bg-red-500 text-white">
                      <Tag size={8} />{discount.percentage}% OFF
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Info ───────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:gap-7">

              {/* Title + description */}
              <div>
                <h1
                  className="text-[25px] sm:text-[32px] lg:text-[40px] font-bold text-[#0d2419] leading-[1.1] tracking-[-0.5px] mb-2 sm:mb-3"
                  style={{ fontFamily: "'Playfair Display',serif" }}
                >
                  {product.name}
                </h1>
                <p className="text-[13.5px] sm:text-[15px] text-[#6b8c77] leading-[1.75]">
                  {product.description}
                </p>
              </div>

              {/* Price card */}
              <div className="bg-white border border-[#e2ede8] rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(13,36,25,0.06)]">
                {hasDiscount && (
                  <div className="bg-gradient-to-r from-red-500 to-[#e11d48] p-3 sm:p-[14px] flex items-center gap-3 sm:gap-3.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Percent size={14} color="#fff" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] sm:text-[13px] font-bold text-white leading-[1.3]">
                        {discount.percentage}% OFF — Special Offer
                      </div>
                      <div className="text-[10.5px] sm:text-[11px] text-white/75 mt-0.5">
                        Save KES {savings.toLocaleString('en-KE')} per unit
                      </div>
                    </div>
                    <span className="flex-shrink-0 bg-white/20 text-white text-[9px] sm:text-[10px] font-extrabold px-2 sm:px-2.5 py-1 rounded-lg tracking-[0.5px]">
                      LIMITED
                    </span>
                  </div>
                )}

                <div className="p-3.5 sm:p-5">
                  <div className="flex items-baseline flex-wrap gap-1">
                    <span
                      className="text-[30px] sm:text-[38px] font-bold text-[#0d2419] leading-none tracking-[-1px]"
                      style={{ fontFamily: "'Playfair Display',serif" }}
                    >
                      KES {discountedPrice.toLocaleString('en-KE')}
                    </span>
                    {hasDiscount && (
                      <span className="text-[13px] sm:text-[16px] text-[#a0b8aa] line-through font-normal ml-1 sm:ml-2.5">
                        KES {originalPrice.toLocaleString('en-KE')}
                      </span>
                    )}
                  </div>

                  {hasDiscount && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-[4px] sm:py-[5px] rounded-[7px] sm:rounded-[9px] bg-[#fff5f5] border border-[#fca5a5] text-red-700">
                        <Tag size={9} />Save KES {savings.toLocaleString('en-KE')}
                      </span>
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-[4px] sm:py-[5px] rounded-[7px] sm:rounded-[9px] bg-[#f0f7f3] border border-[#b7e4c7] text-[#2d6a4f]">
                        <Sparkles size={9} />{discount.percentage}% discount applied
                      </span>
                    </div>
                  )}

                  {/* Stock row */}
                  <div className="flex items-center gap-2 pt-3 mt-3 sm:pt-4 sm:mt-4 border-t border-[#f0f7f3]">
                    <div className={`relative w-2.5 h-2.5 rounded-full flex-shrink-0 ${stockDisplay.dot}`}>
                      {stockDisplay.pulse && (
                        <span className={`absolute inset-0 rounded-full animate-ping opacity-50 ${stockDisplay.dot}`} />
                      )}
                    </div>
                    <span className={`text-[12.5px] sm:text-[13px] font-semibold ${stockDisplay.color}`}>
                      {stockDisplay.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variants */}
              {product.product_variants && product.product_variants.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[2.5px] uppercase text-[#a0b8aa] mb-2 sm:mb-3">
                    Select Size
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {product.product_variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v.id)}
                        disabled={v.stock <= 0}
                        className={`
                          px-4 sm:px-5 py-2 rounded-xl border-[1.5px]
                          min-h-[40px] sm:min-h-0
                          text-[12.5px] sm:text-[13px] font-bold
                          transition-all duration-200
                          disabled:opacity-35 disabled:cursor-not-allowed disabled:line-through
                          ${selectedVariant === v.id
                            ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white shadow-[0_4px_14px_rgba(45,106,79,0.25)]'
                            : 'bg-white border-[#d4e8db] text-[#4a7c5f] hover:border-[#40916c] hover:text-[#2d6a4f] hover:bg-[#f0f7f3] active:bg-[#e8f2ec]'
                          }
                        `}
                        style={{ fontFamily: "'DM Sans',sans-serif" }}
                      >
                        {v.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Staff: qty + CTA ── */}
              {canUseCart ? (
                <div className="flex flex-col gap-3 sm:gap-4">

                  {/* Qty stepper */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[2.5px] uppercase text-[#a0b8aa] mb-2 sm:mb-3">
                      Quantity
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="
                        inline-flex items-center
                        border-[1.5px] border-[#d4e8db] rounded-[13px] sm:rounded-[14px]
                        overflow-hidden bg-white
                        transition-all duration-200
                        focus-within:border-[#40916c] focus-within:shadow-[0_0_0_4px_rgba(64,145,108,0.1)]
                      ">
                        <button
                          onClick={() => applyQty(quantity - 1)}
                          disabled={quantity <= 1}
                          aria-label="Decrease quantity"
                          className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-[#a0b8aa] hover:bg-[#f0f7f3] hover:text-[#2d6a4f] active:bg-[#e8f2ec] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number" min={1} max={maxQty}
                          value={qtyDraft}
                          onChange={e => setQtyDraft(e.target.value)}
                          onBlur={() => applyQty(parseInt(qtyDraft, 10))}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="pd-qty-input w-11 sm:w-14 h-10 sm:h-11 text-center bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-bold text-[#0d2419]"
                          style={{ fontFamily: "'DM Sans',sans-serif" }}
                        />
                        <button
                          onClick={() => applyQty(quantity + 1)}
                          disabled={quantity >= maxQty}
                          aria-label="Increase quantity"
                          className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-[#a0b8aa] hover:bg-[#f0f7f3] hover:text-[#2d6a4f] active:bg-[#e8f2ec] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {product.stock > 0 && (
                        <span className="text-[11px] sm:text-[12px] text-[#a0b8aa] font-medium">
                          {product.stock} unit{product.stock !== 1 ? 's' : ''} available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total preview */}
                  {hasDiscount && quantity > 1 && (
                    <div className="bg-[#f0f7f3] border-[1.5px] border-[#b7e4c7] rounded-[13px] sm:rounded-[14px] p-3 sm:p-[14px] sm:px-[18px] flex items-center justify-between gap-3">
                      <span className="text-[12.5px] sm:text-[13px] font-semibold text-[#2d6a4f]">
                        Total for {quantity} units
                      </span>
                      <div className="text-right">
                        <div
                          className="text-[17px] sm:text-[20px] font-bold text-[#2d6a4f] tracking-[-0.3px]"
                          style={{ fontFamily: "'Playfair Display',serif" }}
                        >
                          KES {(discountedPrice * quantity).toLocaleString('en-KE')}
                        </div>
                        <div className="text-[10.5px] sm:text-[11px] text-[#40916c] font-semibold">
                          Save KES {(savings * quantity).toLocaleString('en-KE')} total
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0 || addedToCart}
                    className={`
                      w-full flex items-center justify-center gap-2.5
                      min-h-[50px] sm:min-h-[54px] px-6 rounded-2xl border-none
                      text-[14px] sm:text-[15px] font-bold
                      transition-all duration-[250ms]
                      ${addedToCart
                        ? 'bg-[#d8f3dc] text-[#2d6a4f] cursor-default shadow-none'
                        : product.stock > 0
                        ? `bg-gradient-to-br from-[#40916c] to-[#1b4332] text-white cursor-pointer
                           shadow-[0_6px_24px_rgba(45,106,79,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
                           hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(45,106,79,0.4)]
                           active:translate-y-0 active:shadow-[0_4px_16px_rgba(45,106,79,0.25)]`
                        : 'bg-[#d4e8db] text-[#a0b8aa] cursor-not-allowed shadow-none'
                      }
                    `}
                    style={{ fontFamily: "'DM Sans',sans-serif" }}
                  >
                    {addedToCart ? (
                      <><CheckCircle size={16} /> Added — redirecting…</>
                    ) : product.stock > 0 ? (
                      <>
                        <ShoppingCart size={16} />
                        {hasDiscount
                          ? `Add to Cart — KES ${discountedPrice.toLocaleString('en-KE')}`
                          : 'Add to Cart'}
                        <ArrowRight size={14} />
                      </>
                    ) : 'Out of Stock'}
                  </button>
                </div>

              ) : (
                /* Guest / customer */
                <div className="relative overflow-hidden bg-[#f0f7f3] border-[1.5px] border-[#b7e4c7] rounded-xl sm:rounded-2xl p-5 sm:p-7 text-center">
                  <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#40916c] opacity-[0.06] pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-[#40916c] opacity-[0.06] pointer-events-none" />
                  <p className="relative text-[13px] sm:text-[14px] font-semibold text-[#2d6a4f] mb-4 sm:mb-[18px] leading-[1.6]">
                    {!user
                      ? 'Online shopping is not available yet, to purchase this item visit us in-store.'
                      : 'Visit us in-store to purchase this item.'}
                  </p>
                  <div className="relative flex items-center justify-center gap-2.5 flex-wrap">
                    {!user && (
                      <button
                        onClick={() => navigate('/login')}
                        className="
                          inline-flex items-center gap-2
                          px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl border-none min-h-[44px]
                          bg-gradient-to-br from-[#40916c] to-[#2d6a4f] text-white
                          text-[13px] sm:text-[14px] font-bold
                          shadow-[0_4px_16px_rgba(45,106,79,0.28)]
                          transition-all duration-200
                          hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(45,106,79,0.38)]
                          active:translate-y-0
                        "
                        style={{ fontFamily: "'DM Sans',sans-serif" }}
                      >
                        <Leaf size={14} /> Sign in
                      </button>
                    )}
                    <button
                      onClick={() => window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank')}
                      className={`
                        inline-flex items-center gap-2
                        px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl border-[1.5px] min-h-[44px]
                        text-[13px] sm:text-[14px] font-bold
                        transition-all duration-200 hover:-translate-y-px active:translate-y-0
                        ${!user
                          ? 'bg-white text-[#2d6a4f] border-[#b7e4c7] shadow-none hover:bg-[#f0f7f3] active:bg-[#e8f2ec]'
                          : 'bg-gradient-to-br from-[#40916c] to-[#2d6a4f] text-white border-transparent shadow-[0_4px_16px_rgba(45,106,79,0.28)] hover:shadow-[0_8px_24px_rgba(45,106,79,0.38)]'
                        }
                      `}
                      style={{ fontFamily: "'DM Sans',sans-serif" }}
                    >
                      <Store size={14} /> Get Directions
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

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, Store, ChevronLeft, Tag, Sparkles, Plus, Minus, Percent } from 'lucide-react';
import { useStore } from '../store';
import { useInventoryVisibility } from '../hooks/useInventoryVisibility';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [discount, setDiscount] = useState<any>(null); // raw discount row from DB
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [qtyDraft, setQtyDraft] = useState('1');

  const addToCart = useStore((state) => state.addToCart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const { canViewStock } = useInventoryVisibility(user?.role);

  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  // ── Fetch product + active discount ──────────────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`*, product_variants(*)`)
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);
        useStore.getState().addViewedProduct(data);

        // Fetch active discount for this product
        const now = new Date().toISOString();
        const { data: discountData } = await supabase
          .from('discounts')
          .select('*')
          .eq('product_id', data.id)
          .lte('start_date', now)
          .gte('end_date', now)
          .maybeSingle();

        setDiscount(discountData || null);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  // ── Discount calculations ─────────────────────────────────────────────────
  const hasDiscount = !!discount && discount.percentage > 0;
  const originalPrice = product?.price ?? 0;
  const discountedPrice = hasDiscount
    ? Math.round(originalPrice - (originalPrice * discount.percentage) / 100)
    : originalPrice;
  const savings = originalPrice - discountedPrice;

  // ── Quantity helpers ──────────────────────────────────────────────────────
  const maxQty = product?.stock ?? 999;

  const applyQty = (raw: number) => {
    const clamped = Math.max(1, Math.min(maxQty, isNaN(raw) ? 1 : raw));
    setQuantity(clamped);
    setQtyDraft(String(clamped));
  };

  // ── Cart ──────────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    if (!canUseCart) {
      alert('Cart functionality is only available to staff members.');
      return;
    }
    if (!product) return;

    const selectedVariantData = selectedVariant
      ? product.product_variants?.find((v) => v.id === selectedVariant)
      : null;

    if (quantity > (selectedVariantData?.stock ?? product.stock)) {
      alert('Not enough stock available for this quantity');
      return;
    }

    // Pass the discount into the cart item so Cart can show discounted price
    addToCart({
      product: { ...product, discount: discount || null },
      variant: selectedVariantData,
      quantity,
    });

    alert(`${product.name} added to cart successfully!`);
    setTimeout(() => navigate('/cart'), 500);
  };

  const openGoogleMaps = () => {
    window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank');
  };

  // ── Stock display ─────────────────────────────────────────────────────────
  const getStockDisplay = (stock: number) => {
    if (canViewStock) {
      if (stock <= 0) return { text: `Out of Stock (0)`, color: 'text-red-500', dot: 'bg-red-500', pulse: false };
      if (stock <= 5) return { text: `Low Stock — only ${stock} left`, color: 'text-amber-600', dot: 'bg-amber-400', pulse: true };
      return { text: `In Stock (${stock} available)`, color: 'text-[#1a6b47]', dot: 'bg-[#2d9e6b]', pulse: true };
    }
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500', dot: 'bg-red-500', pulse: false };
    return { text: 'In Stock', color: 'text-[#1a6b47]', dot: 'bg-[#2d9e6b]', pulse: true };
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-[#d0ece1] border-t-[#1a6b47] animate-spin" />
          <p className="text-sm text-neutral-400 tracking-wide">Loading product…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center">
        <p className="text-neutral-400">Product not found</p>
      </div>
    );
  }

  const stockDisplay = getStockDisplay(product.stock);

  return (
    <div className="min-h-screen bg-[#f7faf8]">

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-sm text-neutral-500 hover:text-[#1a6b47] transition-colors font-medium"
          >
            <span className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center group-hover:border-[#a8dcc5] group-hover:bg-[#eaf5f0] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </span>
            Back
          </button>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 overflow-hidden">
            <span>/</span>
            <span className="capitalize">{product.category}</span>
            <span>/</span>
            <span className="text-neutral-600 font-medium truncate">{product.name}</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 items-start">

          {/* ── Image ── */}
          <div className="relative group lg:sticky lg:top-[80px]">
            <div className="aspect-square rounded-3xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-xl shadow-neutral-200/60">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-3xl" />
            </div>

            {/* Floating badges */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
              <span className="inline-flex items-center bg-[#1a6b47] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-md uppercase tracking-widest">
                {product.category}
              </span>
              {hasDiscount && (
                <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-md">
                  <Tag className="w-3 h-3" />
                  {discount.percentage}% OFF
                </span>
              )}
            </div>
          </div>

          {/* ── Info panel ── */}
          <div className="flex flex-col gap-6">

            {/* Title + description */}
            <div>
              <h1 className="text-[2.2rem] font-extrabold text-neutral-900 leading-[1.1] tracking-tight">
                {product.name}
              </h1>
              <p className="mt-3 text-neutral-500 text-[15px] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* ── Price card ── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">

              {/* Discount banner — shown when active */}
              {hasDiscount && (
                <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Percent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-white font-extrabold text-sm leading-tight">
                      {discount.percentage}% OFF — Special Offer
                    </p>
                    <p className="text-red-100 text-xs mt-0.5">
                      You save KES {savings.toLocaleString('en-KE')} per unit
                    </p>
                  </div>
                  <span className="flex-shrink-0 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    LIMITED
                  </span>
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Price display */}
                {hasDiscount ? (
                  <div>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-[2rem] font-extrabold text-neutral-900 leading-none">
                        KES {discountedPrice.toLocaleString('en-KE')}
                      </span>
                      <span className="text-base text-neutral-400 line-through leading-none">
                        KES {originalPrice.toLocaleString('en-KE')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-extrabold">
                        <Tag className="w-3 h-3" />
                        Save KES {savings.toLocaleString('en-KE')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-[#eaf5f0] border border-[#a8dcc5] text-[#1a6b47] px-3 py-1.5 rounded-lg text-xs font-extrabold">
                        <Sparkles className="w-3 h-3" />
                        {discount.percentage}% discount applied
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[2rem] font-extrabold text-neutral-900 leading-none">
                    KES {originalPrice.toLocaleString('en-KE')}
                  </p>
                )}

                {/* Stock indicator */}
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                  <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                    {stockDisplay.pulse && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${stockDisplay.dot} opacity-50`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${stockDisplay.dot}`} />
                  </span>
                  <span className={`text-sm font-semibold ${stockDisplay.color}`}>{stockDisplay.text}</span>
                </div>
              </div>
            </div>

            {/* ── Variants ── */}
            {product.product_variants && product.product_variants.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-3">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.product_variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      disabled={variant.stock <= 0}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-150 ${
                        selectedVariant === variant.id
                          ? 'bg-[#1a6b47] text-white border-[#1a6b47] shadow-md shadow-green-800/20'
                          : variant.stock <= 0
                          ? 'bg-neutral-50 text-neutral-300 border-neutral-200 cursor-not-allowed line-through'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#2d9e6b] hover:text-[#1a6b47] hover:bg-[#f0faf5]'
                      }`}
                    >
                      {variant.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Quantity + CTA (staff only) ── */}
            {canUseCart ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-3">Quantity</p>
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center rounded-xl border-2 border-neutral-200 bg-white overflow-hidden hover:border-[#a8dcc5] focus-within:border-[#2d9e6b] focus-within:ring-2 focus-within:ring-[#2d9e6b]/20 transition-all duration-150">
                      <button
                        onClick={() => applyQty(quantity - 1)}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-[#1a6b47] hover:bg-[#f0faf5] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={maxQty}
                        value={qtyDraft}
                        onChange={(e) => setQtyDraft(e.target.value)}
                        onBlur={() => applyQty(parseInt(qtyDraft, 10))}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-16 h-11 text-center text-[15px] font-extrabold text-neutral-900 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => applyQty(quantity + 1)}
                        disabled={quantity >= maxQty}
                        aria-label="Increase quantity"
                        className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-[#1a6b47] hover:bg-[#f0faf5] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {product.stock > 0 && (
                      <p className="text-xs text-neutral-400 font-medium">
                        {product.stock} unit{product.stock !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>
                </div>

                {/* Live total preview when discount active */}
                {hasDiscount && quantity > 1 && (
                  <div className="bg-[#eaf5f0] border border-[#a8dcc5] rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-[#1a6b47] text-sm font-semibold">
                      Total for {quantity} units
                    </span>
                    <div className="text-right">
                      <p className="text-[#1a6b47] font-extrabold text-[15px] leading-none">
                        KES {(discountedPrice * quantity).toLocaleString('en-KE')}
                      </p>
                      <p className="text-[#2d9e6b] text-xs mt-0.5">
                        Save KES {(savings * quantity).toLocaleString('en-KE')} total
                      </p>
                    </div>
                  </div>
                )}

                {/* Add to cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className={`w-full group flex items-center justify-center gap-3 py-4 px-8 rounded-2xl text-[15px] font-extrabold tracking-wide transition-all duration-200 ${
                    product.stock > 0
                      ? 'bg-[#1a6b47] text-white hover:bg-[#155a3b] active:scale-[0.98] shadow-lg shadow-green-900/20 hover:shadow-xl'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 group-hover:-rotate-6 transition-transform duration-200" />
                  {product.stock > 0
                    ? hasDiscount
                      ? `Add to Cart — KES ${discountedPrice.toLocaleString('en-KE')}`
                      : 'Add to Cart'
                    : 'Out of Stock'}
                </button>
              </div>
            ) : (
              <div>
                {!user ? (
                  <div className="relative overflow-hidden bg-[#eaf5f0] border border-[#a8dcc5] rounded-2xl p-6 text-center">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#2d9e6b]/10 rounded-full pointer-events-none" />
                    <p className="text-[#1a6b47] text-sm font-semibold mb-4">Sign in to purchase this item</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="bg-[#1a6b47] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all shadow-md shadow-green-900/20"
                    >
                      Login to Purchase
                    </button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden bg-[#eaf5f0] border border-[#a8dcc5] rounded-2xl p-6 text-center">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#2d9e6b]/10 rounded-full pointer-events-none" />
                    <p className="text-[#1a6b47] text-sm font-semibold mb-4">Visit us in-store to purchase this item</p>
                    <button
                      onClick={openGoogleMaps}
                      className="bg-[#1a6b47] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all shadow-md shadow-green-900/20 inline-flex items-center gap-2"
                    >
                      <Store className="w-4 h-4" />
                      Get Directions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetails;
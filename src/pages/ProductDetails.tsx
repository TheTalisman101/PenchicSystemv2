import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, Store, ChevronLeft, Tag, Sparkles, Plus, Minus } from 'lucide-react';
import { useStore } from '../store';
import { useDiscounts } from '../hooks/useDiscounts';
import { useInventoryVisibility } from '../hooks/useInventoryVisibility';
import DiscountBadge from '../components/DiscountBadge';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [productWithDiscount, setProductWithDiscount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [qtyInput, setQtyInput] = useState('1');
  const addToCart = useStore((state) => state.addToCart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const { getProductDiscount } = useDiscounts();
  const { canViewStock } = useInventoryVisibility(user?.role);

  const canSeeDiscounts = !user || user.role === 'customer';
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

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

        if (canSeeDiscounts && data) {
          try {
            const discountInfo = await getProductDiscount(data.id, 1);
            if (discountInfo) {
              setProductWithDiscount({
                ...data,
                discount: {
                  type: 'percentage' as const,
                  value: discountInfo.savings_percentage,
                  original_price: discountInfo.original_price,
                  discounted_price: discountInfo.final_price,
                  savings: discountInfo.discount_amount,
                  campaign_name: discountInfo.offer_description.split(':')[0] || 'Special Offer'
                }
              });
            } else {
              setProductWithDiscount(data);
            }
          } catch (err) {
            console.error('Error loading discount:', err);
            setProductWithDiscount(data);
          }
        } else {
          setProductWithDiscount(data);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id, canSeeDiscounts, user?.id]);

  // Quantity helpers — keep quantity and qtyInput in sync
  const applyQty = (val: number) => {
    const max = product?.stock ?? 999;
    const clamped = Math.max(1, Math.min(max, val));
    setQuantity(clamped);
    setQtyInput(String(clamped));
  };

  const handleQtyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQtyInput(e.target.value);
  };

  const handleQtyInputBlur = () => {
    const parsed = parseInt(qtyInput, 10);
    applyQty(isNaN(parsed) ? 1 : parsed);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    if (!canUseCart) {
      alert('Cart functionality is only available to staff members. Please contact our staff to make a purchase.');
      return;
    }
    if (!product) return;

    const selectedVariantData = selectedVariant
      ? product.product_variants?.find(v => v.id === selectedVariant)
      : null;

    if (quantity > (selectedVariantData?.stock ?? product.stock)) {
      alert('Not enough stock available for this quantity');
      return;
    }

    addToCart({ product, variant: selectedVariantData, quantity });
    alert(`${product.name} added to cart successfully!`);
    setTimeout(() => navigate('/cart'), 500);
  };

  const openGoogleMaps = () => {
    window.open('https://maps.google.com/?q=-0.303099,36.080025', '_blank');
  };

  const getStockDisplay = (stock: number) => {
    if (canViewStock) {
      if (stock <= 0) return { text: `Out of Stock (${stock})`, color: 'text-red-500', dot: 'bg-red-500', pulse: false };
      if (stock <= 5) return { text: `Low Stock — only ${stock} left`, color: 'text-amber-600', dot: 'bg-amber-400', pulse: true };
      return { text: `In Stock (${stock} available)`, color: 'text-[#1a6b47]', dot: 'bg-[#2d9e6b]', pulse: true };
    } else {
      if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-500', dot: 'bg-red-500', pulse: false };
      return { text: 'In Stock', color: 'text-[#1a6b47]', dot: 'bg-[#2d9e6b]', pulse: true };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-full border-2 border-[#d0ece1] border-t-[#1a6b47] animate-spin"></div>
          </div>
          <p className="text-sm text-neutral-400 tracking-wide">Loading product…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center">
        <p className="text-neutral-400 text-lg">Product not found</p>
      </div>
    );
  }

  const displayProduct = productWithDiscount || product;
  const hasDiscount = canSeeDiscounts && displayProduct.discount && displayProduct.discount.value > 0;
  const stockDisplay = getStockDisplay(product.stock);

  return (
    <div className="min-h-screen bg-[#f7faf8]">

      {/* ── Top nav bar ── */}
      <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-sm text-neutral-500 hover:text-[#1a6b47] transition-colors font-medium"
          >
            <span className="w-7 h-7 rounded-lg border border-neutral-200 bg-white flex items-center justify-center group-hover:border-[#a8dcc5] group-hover:bg-[#eaf5f0] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </span>
            Back to shop
          </button>

          <div className="ml-4 flex items-center gap-2 text-xs text-neutral-400">
            <span>/</span>
            <span className="text-neutral-500">{product.category}</span>
            <span>/</span>
            <span className="text-neutral-800 font-medium truncate max-w-[160px]">{product.name}</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 items-start">

          {/* ── Left: Image panel ── */}
          <div className="relative group">
            {/* Main image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-neutral-100 shadow-lg shadow-neutral-200/60 ring-1 ring-neutral-200">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              {/* Subtle gradient at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>

            {/* Floating badges */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
              <span className="inline-flex items-center bg-[#1a6b47] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md uppercase tracking-widest">
                {product.category}
              </span>
              {hasDiscount && displayProduct.discount.type !== 'buy_x_get_y' && (
                <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md">
                  <Tag className="w-3 h-3" />
                  {displayProduct.discount.value}% OFF
                </span>
              )}
            </div>
          </div>

          {/* ── Right: Product info panel ── */}
          <div className="flex flex-col gap-7">

            {/* Title block */}
            <div>
              <h1 className="text-[2.4rem] font-extrabold text-neutral-900 leading-[1.1] tracking-tight">
                {product.name}
              </h1>
              <p className="mt-3 text-neutral-500 text-[15px] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* ── Price card ── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
              {hasDiscount ? (
                displayProduct.discount.type === 'buy_x_get_y' ? (
                  <div>
                    <p className="text-3xl font-extrabold text-neutral-900 mb-4">
                      KES {displayProduct.discount.original_price.toLocaleString()}
                    </p>
                    <div className="bg-[#eaf5f0] border border-[#a8dcc5] rounded-xl p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#2d9e6b] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-[#1a6b47] text-sm">
                          Buy {displayProduct.discount.buy_quantity} Get {displayProduct.discount.get_quantity} Free
                        </p>
                        <p className="text-[#2d9e6b] text-xs mt-0.5">Limited promotional offer</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="text-3xl font-extrabold text-neutral-900">
                        KES {displayProduct.discount.discounted_price.toLocaleString()}
                      </span>
                      <span className="text-base text-neutral-400 line-through">
                        KES {displayProduct.discount.original_price.toLocaleString()}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 bg-[#eaf5f0] border border-[#a8dcc5] text-[#1a6b47] px-3 py-1.5 rounded-lg text-xs font-bold">
                      <Tag className="w-3 h-3" />
                      You save KES {displayProduct.discount.savings.toLocaleString()}
                    </div>
                  </div>
                )
              ) : (
                <p className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                  KES {product.price.toLocaleString()}
                </p>
              )}

              {/* Stock pill */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-100">
                <span className="relative flex h-2.5 w-2.5">
                  {stockDisplay.pulse && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${stockDisplay.dot} opacity-50`}></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${stockDisplay.dot}`}></span>
                </span>
                <span className={`text-sm font-semibold ${stockDisplay.color}`}>
                  {stockDisplay.text}
                </span>
              </div>
            </div>

            {/* ── Size variants ── */}
            {product.product_variants && product.product_variants.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.product_variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      disabled={variant.stock <= 0}
                      className={`relative px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-150 ${
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

            {/* ── Cart actions ── */}
            {canUseCart ? (
              <div className="space-y-4">
                {/* Quantity stepper */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Quantity</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border-2 border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:border-[#a8dcc5] focus-within:border-[#2d9e6b] focus-within:ring-2 focus-within:ring-[#2d9e6b]/20 transition-all">
                      <button
                        onClick={() => applyQty(quantity - 1)}
                        disabled={quantity <= 1}
                        className="w-11 h-11 flex items-center justify-center text-neutral-500 hover:text-[#1a6b47] hover:bg-[#f0faf5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={product.stock}
                        value={qtyInput}
                        onChange={handleQtyInputChange}
                        onBlur={handleQtyInputBlur}
                        onKeyDown={handleQtyKeyDown}
                        className="w-16 h-11 text-center text-base font-bold text-neutral-900 bg-transparent border-none outline-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      <button
                        onClick={() => applyQty(quantity + 1)}
                        disabled={quantity >= product.stock}
                        className="w-11 h-11 flex items-center justify-center text-neutral-500 hover:text-[#1a6b47] hover:bg-[#f0faf5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-neutral-400">
                      {product.stock > 0 ? `Max ${product.stock} units` : ''}
                    </p>
                  </div>
                </div>

                {/* Add to cart CTA */}
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className={`w-full group flex items-center justify-center gap-3 py-4 px-8 rounded-2xl text-[15px] font-bold tracking-wide transition-all duration-200 ${
                    product.stock > 0
                      ? 'bg-[#1a6b47] text-white hover:bg-[#155a3b] active:scale-[0.98] shadow-lg shadow-green-900/20 hover:shadow-xl hover:shadow-green-900/25'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 transition-transform group-hover:-rotate-6" />
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            ) : (
              <div>
                {!user ? (
                  <div className="relative overflow-hidden bg-[#eaf5f0] border border-[#a8dcc5] rounded-2xl p-6 text-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#2d9e6b]/10 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
                    <p className="text-[#1a6b47] text-sm font-semibold mb-4">Sign in to purchase this item</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="bg-[#1a6b47] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all duration-150 shadow-md shadow-green-900/20"
                    >
                      Login to Purchase
                    </button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden bg-[#eaf5f0] border border-[#a8dcc5] rounded-2xl p-6 text-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#2d9e6b]/10 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
                    <p className="text-[#1a6b47] text-sm font-semibold mb-4">Visit us in-store to purchase this item</p>
                    <button
                      onClick={openGoogleMaps}
                      className="bg-[#1a6b47] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all duration-150 shadow-md shadow-green-900/20 flex items-center justify-center gap-2 mx-auto"
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
      </div>
    </div>
  );
};

export default ProductDetails;
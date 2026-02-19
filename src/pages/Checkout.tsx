import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ShoppingBag, CreditCard, Banknote, ChevronLeft, Tag, Sparkles, Package } from 'lucide-react';

// ── Discount helpers ──────────────────────────────────────────────────────────
const getDiscountedPrice = (product: any): number => {
  if (!product.discount?.percentage) return product.price;
  return Math.round(product.price - (product.price * product.discount.percentage) / 100);
};

const Checkout = () => {
  const cartItems = useStore((state) => state.cart);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();

  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  useEffect(() => {
    if (!canUseCart) navigate('/');
  }, [canUseCart, navigate]);

  if (!canUseCart) return null;

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotalOriginal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  );
  const totalDiscounted = cartItems.reduce(
    (sum, item) => sum + getDiscountedPrice(item.product) * item.quantity, 0
  );
  const totalSavings = subtotalOriginal - totalDiscounted;
  const hasAnyDiscount = totalSavings > 0;

  const handlePayment = (method: string) => {
    if (cartItems.length === 0) {
      alert('Your cart is empty. Please add items before payment.');
      return;
    }
    if (method === 'mpesa') navigate('/payment/mpesa');
    else if (method === 'cash') navigate('/payment/cash');
  };

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-[#eaf5f0] border border-[#c5e8d9] flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-[#2d9e6b]" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold mb-2 text-neutral-900 tracking-tight">Your cart is empty</h2>
          <p className="text-neutral-400 mb-8 text-sm leading-relaxed">
            Add some items to your cart to proceed with checkout.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="inline-flex items-center gap-2 bg-[#1a6b47] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all shadow-md shadow-green-900/20"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf8]">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-3">

          <button
            onClick={() => navigate('/cart')}
            className="group flex items-center gap-2 text-sm text-neutral-500 hover:text-[#1a6b47] transition-colors font-medium"
          >
            <span className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center group-hover:border-[#a8dcc5] group-hover:bg-[#eaf5f0] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:block">Back to Cart</span>
          </button>

          {/* Progress steps */}
          <div className="flex items-center gap-2 ml-auto text-xs font-semibold">
            <span className="text-neutral-400">Cart</span>
            <span className="w-8 h-px bg-neutral-300" />
            <span className="text-[#1a6b47] font-extrabold">Checkout</span>
            <span className="w-8 h-px bg-neutral-300" />
            <span className="text-neutral-400">Payment</span>
          </div>
        </div>
      </header>

      {/* ── Savings banner ── */}
      {hasAnyDiscount && (
        <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-bold">
              You're saving{' '}
              <span className="underline underline-offset-2">
                KES {totalSavings.toLocaleString('en-KE')}
              </span>{' '}
              with active discounts on this order!
            </p>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── Left: Order items ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-[#2d9e6b]" />
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                Order Summary
              </p>
            </div>

            {cartItems.map((item) => {
              const hasDiscount = !!item.product.discount?.percentage;
              const unitPrice = getDiscountedPrice(item.product);
              const lineTotal = unitPrice * item.quantity;
              const lineSavings = (item.product.price - unitPrice) * item.quantity;

              return (
                <div
                  key={`${item.product.id}-${item.variant?.id ?? 'default'}`}
                  className={`bg-white rounded-2xl border overflow-hidden ${
                    hasDiscount ? 'border-red-200' : 'border-neutral-200'
                  }`}
                >
                  {/* Discount ribbon */}
                  {hasDiscount && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <p className="text-red-600 text-xs font-bold">
                        {item.product.discount.percentage}% discount applied
                        {item.quantity > 1 && (
                          <span className="text-red-400 font-semibold ml-1">
                            — saving KES {lineSavings.toLocaleString('en-KE')} on this line
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                      {hasDiscount && (
                        <div className="absolute top-1 left-1">
                          <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm">
                            -{item.product.discount.percentage}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-neutral-900 text-sm leading-snug truncate">
                        {item.product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-neutral-400 text-xs">×{item.quantity}</span>
                        {item.variant && (
                          <span className="text-[10px] bg-[#eaf5f0] text-[#1a6b47] border border-[#c5e8d9] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                            {item.variant.size}
                          </span>
                        )}
                      </div>

                      {/* Unit price */}
                      {hasDiscount ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-neutral-900 text-xs font-bold">
                            KES {unitPrice.toLocaleString('en-KE')}
                          </span>
                          <span className="text-neutral-400 text-xs line-through">
                            KES {item.product.price.toLocaleString('en-KE')}
                          </span>
                          <span className="text-red-500 text-[10px] font-bold">/ unit</span>
                        </div>
                      ) : (
                        <p className="text-neutral-400 text-xs mt-1">
                          KES {item.product.price.toLocaleString('en-KE')} / unit
                        </p>
                      )}
                    </div>

                    {/* Line total */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-neutral-900 text-[15px]">
                        KES {lineTotal.toLocaleString('en-KE')}
                      </p>
                      {hasDiscount && lineSavings > 0 && (
                        <p className="text-red-500 text-[10px] font-bold mt-0.5">
                          Save KES {lineSavings.toLocaleString('en-KE')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Totals + payment ── */}
          <div className="space-y-4 lg:sticky lg:top-[76px]">

            {/* Price breakdown */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-[#f7faf8] border-b border-neutral-100">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                  Price Breakdown
                </p>
              </div>
              <div className="p-5 space-y-3">
                {hasAnyDiscount && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Original subtotal</span>
                      <span className="text-neutral-400 line-through font-medium">
                        KES {subtotalOriginal.toLocaleString('en-KE')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-red-600 font-bold">
                        <Tag className="w-3.5 h-3.5" />
                        Discounts
                      </span>
                      <span className="text-red-600 font-bold">
                        -KES {totalSavings.toLocaleString('en-KE')}
                      </span>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <p className="text-red-600 text-xs font-bold">
                        You're saving KES {totalSavings.toLocaleString('en-KE')} on this order
                      </p>
                    </div>
                    <div className="h-px bg-neutral-100" />
                  </>
                )}
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-neutral-700 text-sm">
                    {hasAnyDiscount ? 'Total after discounts' : 'Total'}
                  </span>
                  <span className="text-[1.6rem] font-extrabold text-neutral-900 tracking-tight leading-none">
                    KES {totalDiscounted.toLocaleString('en-KE')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-[#f7faf8] border-b border-neutral-100">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                  Select Payment Method
                </p>
              </div>
              <div className="p-5 space-y-3">

                {/* M-Pesa */}
                <button
                  onClick={() => handlePayment('mpesa')}
                  className="w-full group flex items-center gap-4 bg-[#eaf5f0] border-2 border-[#a8dcc5] hover:border-[#2d9e6b] hover:bg-[#d6f0e5] p-4 rounded-xl transition-all duration-150 active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#1a6b47] flex items-center justify-center flex-shrink-0 shadow-md shadow-green-900/20">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-grow">
                    <p className="font-extrabold text-[15px] text-[#1a6b47] leading-tight">M-Pesa</p>
                    <p className="text-[#2d9e6b] text-xs font-semibold mt-0.5">Pay via mobile money</p>
                  </div>
                  <span className="text-[#2d9e6b] text-lg font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                </button>

                {/* Cash */}
                <button
                  onClick={() => handlePayment('cash')}
                  className="w-full group flex items-center gap-4 bg-neutral-50 border-2 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-100 p-4 rounded-xl transition-all duration-150 active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center flex-shrink-0 shadow-md shadow-neutral-900/15">
                    <Banknote className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-grow">
                    <p className="font-extrabold text-[15px] text-neutral-900 leading-tight">Cash</p>
                    <p className="text-neutral-500 text-xs font-semibold mt-0.5">Pay in person</p>
                  </div>
                  <span className="text-neutral-400 text-lg font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                </button>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, ChevronLeft, Package } from 'lucide-react';

// ─── Reusable quantity stepper ────────────────────────────────────────────────
interface QtyStepperProps {
  value: number;
  max: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onSet: (val: number) => void;
}

const QtyStepper: React.FC<QtyStepperProps> = ({ value, max, onIncrement, onDecrement, onSet }) => {
  const [draft, setDraft] = useState(String(value));

  // Keep draft in sync when external value changes (e.g. store update)
  useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    onSet(isNaN(parsed) ? value : parsed);
  };

  return (
    <div className="inline-flex items-center rounded-xl border-2 border-neutral-200 bg-white overflow-hidden hover:border-[#a8dcc5] focus-within:border-[#2d9e6b] focus-within:ring-2 focus-within:ring-[#2d9e6b]/20 transition-all duration-150">
      <button
        onClick={onDecrement}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-[#1a6b47] hover:bg-[#f0faf5] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <input
        type="number"
        min={1}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-11 h-9 text-center text-[13px] font-bold text-neutral-900 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button
        onClick={onIncrement}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-[#1a6b47] hover:bg-[#f0faf5] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Cart component ───────────────────────────────────────────────────────────
const Cart = () => {
  const { cartItems, clearCart, updateCartQuantity, setCartQuantity, removeFromCart } = useStore(
    (state) => ({
      cartItems: state.cart,
      clearCart: state.clearCart,
      updateCartQuantity: state.updateCartQuantity,
      setCartQuantity: state.setCartQuantity,
      removeFromCart: state.removeFromCart,
    })
  );

  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  useEffect(() => {
    if (!canUseCart) navigate('/');
  }, [canUseCart, navigate]);

  if (!canUseCart) return null;

  const handleCheckout = () => {
    if (cartItems.length === 0) { alert('Your cart is empty.'); return; }
    navigate('/checkout');
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  );
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ── Empty state ──
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-[#eaf5f0] border border-[#c5e8d9] flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-[#2d9e6b]" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold mb-2 text-neutral-900 tracking-tight">Your cart is empty</h2>
          <p className="text-neutral-400 mb-8 text-sm leading-relaxed">
            Head back to the shop and add some items to get started.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="inline-flex items-center gap-2 bg-[#1a6b47] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#155a3b] active:scale-[0.97] transition-all shadow-md shadow-green-900/20"
          >
            Browse Products
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf8]">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between gap-4">

          {/* Back */}
          <button
            onClick={() => navigate('/shop')}
            className="group flex items-center gap-2 text-sm text-neutral-500 hover:text-[#1a6b47] transition-colors font-medium flex-shrink-0"
          >
            <span className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center group-hover:border-[#a8dcc5] group-hover:bg-[#eaf5f0] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </span>
            <span className="hidden sm:block">Continue shopping</span>
          </button>

          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a6b47] flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-neutral-900 text-[15px] tracking-tight">Shopping Cart</span>
            <span className="text-xs font-bold bg-[#eaf5f0] text-[#1a6b47] border border-[#a8dcc5] px-2.5 py-1 rounded-full">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Clear */}
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors font-semibold flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Clear all</span>
          </button>
        </div>
      </header>

      {/* ── Page body ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Left: item cards ── */}
          <div className="space-y-3">
            {cartItems.map((item) => {
              const key = `${item.product.id}-${item.variant?.id ?? 'default'}`;
              return (
                <article
                  key={key}
                  className="group bg-white rounded-2xl border border-neutral-200 hover:border-[#b8dfd0] hover:shadow-lg hover:shadow-green-900/5 transition-all duration-200"
                >
                  <div className="flex gap-4 p-4">

                    {/* Thumbnail */}
                    <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-grow min-w-0 gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-neutral-900 text-[15px] leading-snug truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-neutral-400 text-xs mt-0.5">
                            KES {item.product.price.toLocaleString('en-KE')} / unit
                          </p>
                          {item.variant && (
                            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#eaf5f0] text-[#1a6b47] border border-[#c5e8d9] px-2 py-0.5 rounded-md">
                              Size: {item.variant.size}
                            </span>
                          )}
                        </div>

                        {/* Delete (desktop) */}
                        <button
                          onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                          title="Remove item"
                          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bottom row: stepper + subtotal */}
                      <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
                        <QtyStepper
                          value={item.quantity}
                          max={item.product.stock}
                          onIncrement={() => updateCartQuantity(item.product.id, item.variant?.id, 1)}
                          onDecrement={() => updateCartQuantity(item.product.id, item.variant?.id, -1)}
                          onSet={(val) => setCartQuantity(item.product.id, item.variant?.id, val)}
                        />

                        <div className="text-right">
                          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Subtotal</p>
                          <p className="text-[17px] font-extrabold text-neutral-900 leading-tight">
                            KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── Right: order summary ── */}
          <aside>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden sticky top-[76px]">

              {/* Summary header */}
              <div className="px-5 py-4 bg-[#f7faf8] border-b border-neutral-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#2d9e6b]" />
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">
                  Order Summary
                </p>
              </div>

              {/* Line items */}
              <div className="p-5 space-y-3 max-h-[280px] overflow-y-auto">
                {cartItems.map((item) => (
                  <div
                    key={`${item.product.id}-${item.variant?.id ?? 'default'}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-neutral-700 font-medium truncate leading-tight">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-neutral-400 text-[11px]">{item.variant.size}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-neutral-900 font-bold">
                        KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                      </p>
                      <p className="text-neutral-400 text-[11px]">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals + CTA */}
              <div className="px-5 pb-5 pt-4 border-t border-neutral-100 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-neutral-500 font-semibold">Total</span>
                  <span className="text-[1.6rem] font-extrabold text-neutral-900 tracking-tight leading-none">
                    KES {totalAmount.toLocaleString('en-KE')}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full group flex items-center justify-center gap-2.5 bg-[#1a6b47] text-white py-4 px-6 rounded-xl text-[14px] font-bold tracking-wide hover:bg-[#155a3b] active:scale-[0.98] transition-all duration-150 shadow-lg shadow-green-900/20 hover:shadow-xl hover:shadow-green-900/25"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <p className="text-center text-[11px] text-neutral-400">
                  Prices are in Kenyan Shillings (KES)
                </p>
              </div>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default Cart;
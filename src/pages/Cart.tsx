import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, ChevronLeft } from 'lucide-react';

// Per-item quantity stepper with manual input support
const QuantityStepper = ({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (val: number) => void;
}) => {
  const [inputVal, setInputVal] = useState(String(value));

  // Keep local input in sync if parent value changes externally
  useEffect(() => {
    setInputVal(String(value));
  }, [value]);

  const applyQty = (raw: number) => {
    const clamped = Math.max(1, Math.min(max, isNaN(raw) ? 1 : raw));
    onChange(clamped);
    setInputVal(String(clamped));
  };

  return (
    <div className="flex items-center bg-white border-2 border-neutral-200 rounded-xl overflow-hidden hover:border-[#a8dcc5] focus-within:border-[#2d9e6b] focus-within:ring-2 focus-within:ring-[#2d9e6b]/20 transition-all">
      <button
        onClick={() => applyQty(value - 1)}
        disabled={value <= 1}
        className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-[#1a6b47] hover:bg-[#f0faf5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <input
        type="number"
        min="1"
        max={max}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={() => applyQty(parseInt(inputVal, 10))}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-12 h-9 text-center text-sm font-bold text-neutral-900 bg-transparent border-none outline-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button
        onClick={() => applyQty(value + 1)}
        disabled={value >= max}
        className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-[#1a6b47] hover:bg-[#f0faf5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const Cart = () => {
  const { cartItems, clearCart, updateCartQuantity, removeFromCart } = useStore((state) => ({
    cartItems: state.cart,
    clearCart: state.clearCart,
    updateCartQuantity: state.updateCartQuantity,
    removeFromCart: state.removeFromCart,
  }));

  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  useEffect(() => {
    if (!canUseCart) navigate('/');
  }, [canUseCart, navigate]);

  if (!canUseCart) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#eaf5f0] flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-[#2d9e6b]" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Access Restricted</h2>
          <p className="text-neutral-500 mb-6 text-sm">Cart functionality is only available to staff members</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#1a6b47] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) { alert('Your cart is empty.'); return; }
    navigate('/checkout');
  };

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity, 0
  );

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#eaf5f0] flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-[#2d9e6b]" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Your cart is empty</h2>
          <p className="text-neutral-500 mb-6 text-sm">Add some items to get started</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-[#1a6b47] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf8]">

      {/* ── Sticky top bar ── */}
      <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/shop')}
            className="group flex items-center gap-2 text-sm text-neutral-500 hover:text-[#1a6b47] transition-colors font-medium"
          >
            <span className="w-7 h-7 rounded-lg border border-neutral-200 bg-white flex items-center justify-center group-hover:border-[#a8dcc5] group-hover:bg-[#eaf5f0] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </span>
            Continue shopping
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1a6b47] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-neutral-900">
              Cart
              <span className="ml-2 text-xs font-semibold bg-[#eaf5f0] text-[#1a6b47] border border-[#a8dcc5] px-2 py-0.5 rounded-full">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Items list ── */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item) => (
              <div
                key={`${item.product.id}-${item.variant?.id ?? 'default'}`}
                className="group bg-white rounded-2xl border border-neutral-200 hover:border-[#a8dcc5] hover:shadow-md hover:shadow-green-900/5 transition-all duration-200 overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Product image */}
                  <div className="relative w-[88px] h-[88px] flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Name + meta */}
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-neutral-900 text-[15px] leading-tight truncate">
                      {item.product.name}
                    </h3>
                    <p className="text-neutral-400 text-xs mt-1">
                      KES {item.product.price.toLocaleString('en-KE')} each
                    </p>
                    {item.variant && (
                      <span className="inline-block mt-2 text-[11px] bg-[#eaf5f0] text-[#1a6b47] border border-[#a8dcc5] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        Size: {item.variant.size}
                      </span>
                    )}
                  </div>

                  {/* Delete (top right on desktop) */}
                  <button
                    onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                    className="hidden md:flex w-8 h-8 items-center justify-center rounded-xl text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 flex-shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom row: qty + subtotal + mobile delete */}
                <div className="flex items-center justify-between px-4 pb-4 gap-3">
                  <QuantityStepper
                    value={item.quantity}
                    max={item.product.stock}
                    onChange={(newQty) => {
                      // updateCartQuantity takes a delta, so compute it
                      const delta = newQty - item.quantity;
                      if (delta !== 0) updateCartQuantity(item.product.id, item.variant?.id, delta);
                    }}
                  />

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-neutral-400">Subtotal</p>
                      <p className="font-extrabold text-neutral-900 text-[15px]">
                        KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                      </p>
                    </div>

                    {/* Mobile delete */}
                    <button
                      onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                      className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Clear all */}
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors py-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all items
            </button>
          </div>

          {/* ── Order summary panel ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden sticky top-20">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-neutral-100 bg-[#f7faf8]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Order Summary</p>
              </div>

              <div className="p-5 space-y-3">
                {cartItems.map((item) => (
                  <div key={`${item.product.id}-${item.variant?.id ?? 'default'}`} className="flex justify-between gap-2 text-sm">
                    <span className="text-neutral-500 truncate">
                      {item.product.name}
                      <span className="text-neutral-400 ml-1">×{item.quantity}</span>
                    </span>
                    <span className="text-neutral-800 font-semibold flex-shrink-0">
                      KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="px-5 pt-3 pb-5 border-t border-neutral-100">
                <div className="flex justify-between items-baseline mb-5">
                  <span className="text-sm text-neutral-500 font-medium">Total</span>
                  <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                    KES {totalAmount.toLocaleString('en-KE')}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                  className="w-full group flex items-center justify-center gap-2.5 bg-[#1a6b47] text-white py-3.5 px-6 rounded-xl text-sm font-bold hover:bg-[#155a3b] active:scale-[0.98] transition-all duration-150 disabled:opacity-40 shadow-md shadow-green-900/20"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cart;
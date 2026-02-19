import React from 'react';
import { useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';

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
    if (!canUseCart) {
      navigate('/');
    }
  }, [canUseCart, navigate]);

  if (!canUseCart) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-neutral-100 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-neutral-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-neutral-900 tracking-tight">Access Restricted</h2>
          <p className="text-neutral-500 mb-6 text-sm">Cart functionality is only available to staff members</p>
          <button
            onClick={() => navigate('/')}
            className="bg-neutral-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-neutral-700 transition-all duration-200"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }
    navigate('/checkout');
  };

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-neutral-100 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-neutral-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-neutral-900 tracking-tight">Your cart is empty</h2>
          <p className="text-neutral-500 mb-6 text-sm">Add some items to your cart to get started</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-neutral-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-neutral-700 transition-all duration-200"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight leading-none">Shopping Cart</h1>
            <p className="text-neutral-500 text-sm mt-0.5">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item, index) => (
              <div
                key={item.product.id}
                className="group bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-4 hover:border-neutral-300 hover:shadow-sm transition-all duration-200"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Image */}
                <div className="relative flex-shrink-0">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-xl bg-neutral-100"
                  />
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-neutral-900 truncate text-sm leading-tight">{item.product.name}</h3>
                  <p className="text-neutral-500 text-xs mt-0.5">
                    KES {item.product.price.toLocaleString('en-KE')} each
                  </p>
                  {item.variant && (
                    <span className="inline-block mt-1.5 text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-medium">
                      {item.variant.size}
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Quantity */}
                  <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.variant?.id, -1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold text-neutral-900 select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.variant?.id, 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="w-24 text-right">
                    <p className="font-bold text-neutral-900 text-sm">
                      KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Clear cart */}
            <button
              onClick={clearCart}
              className="text-sm text-neutral-400 hover:text-red-500 transition-colors py-2 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all items
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sticky top-6">
              <h2 className="font-bold text-neutral-900 text-sm uppercase tracking-wider mb-5">Order Summary</h2>

              <div className="space-y-3 mb-5">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-neutral-500 truncate pr-2">
                      {item.product.name} <span className="text-neutral-400">×{item.quantity}</span>
                    </span>
                    <span className="text-neutral-700 font-medium flex-shrink-0">
                      KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-100 pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-neutral-500 text-sm">Total</span>
                  <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                    KES {totalAmount.toLocaleString('en-KE')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white py-3.5 px-6 rounded-xl text-sm font-semibold hover:bg-neutral-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-40"
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
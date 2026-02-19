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

  // Check if user can access cart (only admin and worker)
  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  // Redirect if user cannot access cart
  useEffect(() => {
    if (!canUseCart) {
      navigate('/');
    }
  }, [canUseCart, navigate]);

  if (!canUseCart) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Access Restricted</h2>
          <p className="text-neutral-600 mb-4">Cart functionality is only available to staff members</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
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
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Your cart is empty</h2>
          <p className="text-neutral-600 mb-4">Add some items to your cart to get started</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
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
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-200">
          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold mb-8 text-neutral-900">Shopping Cart</h1>

            <div className="space-y-6">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200"
                >
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                  
                  <div className="flex-grow">
                    <h3 className="font-medium text-lg text-neutral-900">{item.product.name}</h3>
                    <p className="text-neutral-600">
                      KES {item.product.price.toLocaleString('en-KE')} each
                    </p>
                  </div>

                  <div className="flex items-center bg-white rounded-lg border border-neutral-300">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.variant?.id, -1)}
                      className="p-2 hover:bg-neutral-100 text-neutral-800 rounded-l-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center py-2 font-medium text-neutral-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.variant?.id, 1)}
                      className="p-2 hover:bg-neutral-100 text-neutral-800 rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="font-medium text-neutral-900">
                      KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-200">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <button
                  onClick={clearCart}
                  className="px-6 py-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500"
                >
                  Clear Cart
                </button>

                <div className="text-right">
                  <p className="text-neutral-600 mb-1">Total Amount:</p>
                  <p className="text-3xl font-bold text-neutral-900">
                    KES {totalAmount.toLocaleString('en-KE')}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCheckout}
                  className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  disabled={cartItems.length === 0}
                >
                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5" />
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
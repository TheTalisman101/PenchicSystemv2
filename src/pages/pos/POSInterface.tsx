import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Smartphone,
  Banknote,
  Package,
  User,
  LogOut,
  X,
  Maximize,
  Minimize,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DiscountCalculator from '../../components/pos/DiscountCalculator';
import DiscountBadge from '../../components/DiscountBadge';
import ReceiptPrinter from '../../components/pos/ReceiptPrinter';
import { Product, CartItem } from '../../types';

const POSInterface = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartQuantity = useStore((state) => state.updateCartQuantity);
  const clearCart = useStore((state) => state.clearCart);
  const containerRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [processing, setProcessing] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;

      const now = new Date().toISOString();
      const { data: discounts, error: discountError } = await supabase
        .from('discounts')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now);

      if (discountError) {
        console.error('Error fetching discounts:', discountError);
      }

      const productsWithDiscounts = (productsData || []).map(product => {
        const discount = discounts?.find(d => d.product_id === product.id);
        return {
          ...product,
          discount: discount || null
        };
      });

      setProducts(productsWithDiscounts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Product out of stock');
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem && existingItem.quantity >= product.stock) {
      alert('Cannot add more items than available in stock');
      return;
    }

    addToCart({ product, quantity: 1 });
    setShowMobileCart(true);
  };

  const handleDiscountApplied = (discounts: any[]) => {
    setAppliedDiscounts(discounts);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const calculateDiscountTotal = () => {
    return appliedDiscounts.reduce((sum, discount) => sum + discount.savings, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountTotal();
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error attempting to exit fullscreen:', err);
      }
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^(254|0)?[17]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (paymentMethod === 'mpesa') {
      if (!mpesaPhoneNumber.trim()) {
        setPhoneError('Phone number is required for M-Pesa payment');
        return;
      }
      if (!validatePhoneNumber(mpesaPhoneNumber)) {
        setPhoneError('Invalid phone number. Use format: 0712345678 or 254712345678');
        return;
      }
      setPhoneError('');
    }

    setProcessing(true);
    try {
      const totalAmount = calculateTotal();
      const subtotalAmount = calculateSubtotal();
      const discountAmount = calculateDiscountTotal();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id,
            status: 'completed',
            total: totalAmount,
            cashier_id: user?.id
          }
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => {
        const discountInfo = appliedDiscounts.find(d => d.productId === item.product.id);
        return {
          order_id: order.id,
          product_id: item.product.id,
          variant_id: item.variant?.id || null,
          quantity: item.quantity,
          price: item.product.price,
          discount_amount: discountInfo ? discountInfo.discountAmount / item.quantity : 0
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      let paymentStatus = 'completed';
      let mpesaReference = null;

      if (paymentMethod === 'mpesa') {
        try {
          const formattedPhone = formatPhoneNumber(mpesaPhoneNumber);
          const { data: mpesaData, error: mpesaError } = await supabase.functions.invoke('mpesa-payment', {
            body: {
              orderId: order.id,
              phoneNumber: formattedPhone,
              amount: Math.round(totalAmount)
            }
          });

          if (mpesaError || !mpesaData?.success) {
            throw new Error(mpesaData?.message || 'M-Pesa payment initiation failed');
          }

          mpesaReference = mpesaData.data?.CheckoutRequestID || null;
          paymentStatus = 'pending';
          alert('Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.');
        } catch (mpesaError: any) {
          console.error('M-Pesa payment error:', mpesaError);
          alert(`M-Pesa payment failed: ${mpesaError.message || 'Please try again or use another payment method'}`);
          throw mpesaError;
        }
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            order_id: order.id,
            amount: totalAmount,
            payment_method: paymentMethod,
            status: paymentStatus,
            mpesa_reference: mpesaReference
          }
        ]);

      if (paymentError) throw paymentError;

      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product.id);

        if (stockError) throw stockError;

        await supabase
          .from('stock_logs')
          .insert([
            {
              product_id: item.product.id,
              variant_id: item.variant?.id || null,
              previous_stock: item.product.stock,
              new_stock: newStock,
              change_type: 'sale',
              reason: `POS Sale - Order #${order.id}`,
              changed_by: user?.id
            }
          ]);
      }

      const receiptItems = cart.map(item => {
        const discountInfo = appliedDiscounts.find(d => d.productId === item.product.id);
        const discountPerItem = discountInfo ? discountInfo.discountAmount / item.quantity : 0;
        return {
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          discount: discountPerItem,
          total: (item.product.price - discountPerItem) * item.quantity
        };
      });

      setCompletedOrder({
        orderId: order.id,
        items: receiptItems,
        subtotal: subtotalAmount,
        discount: discountAmount,
        total: totalAmount,
        paymentMethod,
        cashierEmail: user?.email || '',
        date: new Date()
      });

      clearCart();
      setShowCheckout(false);
      setAppliedDiscounts([]);
      setShowMobileCart(false);
      setShowReceipt(true);
      setMpesaPhoneNumber('');
      setPhoneError('');
      fetchProducts();
    } catch (error: any) {
      console.error('Error processing order:', error);
      const errorMessage = error.message || 'Failed to process order. Please try again.';
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentMethodChange = (method: 'cash' | 'mpesa' | 'card') => {
    setPaymentMethod(method);
    setPhoneError('');
    if (method !== 'mpesa') {
      setMpesaPhoneNumber('');
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const CartPanel = () => (
    <div className="h-full bg-white flex flex-col">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Cart
          </h2>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-500 hover:text-red-600 transition-colors text-sm"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowMobileCart(false)}
              className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-600">{cart.length} items</p>
      </div>

      <div className="flex-1 overflow-auto">
        {cart.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <p className="text-neutral-600">Cart is empty</p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              {cart.map((item) => (
                <div key={`${item.product.id}-${item.variant?.id || ''}`} className="bg-neutral-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-neutral-900 flex-1">{item.product.name}</h3>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.variant?.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.variant?.id, -1)}
                        className="p-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.variant?.id, 1)}
                        className="p-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-bold text-neutral-900">
                      KES {(item.product.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <DiscountCalculator
              cartItems={cart}
              onDiscountApplied={handleDiscountApplied}
              userId={user?.id}
            />
          </>
        )}
      </div>

      <div className="border-t border-neutral-200 p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-medium">KES {calculateSubtotal().toLocaleString()}</span>
          </div>
          {calculateDiscountTotal() > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Discount</span>
              <span className="font-medium text-green-600">-KES {calculateDiscountTotal().toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
            <span>Total</span>
            <span className="text-primary">KES {calculateTotal().toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={() => setShowCheckout(true)}
          disabled={cart.length === 0}
          className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
        >
          <CreditCard className="w-5 h-5" />
          Checkout
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-neutral-50">
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl lg:text-2xl font-bold text-neutral-900">POS Terminal</h1>
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="hidden md:flex items-center gap-2">
                  <User className="w-5 h-5 text-neutral-500" />
                  <span className="text-sm text-neutral-600">{user?.email}</span>
                </div>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit POS</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 lg:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 lg:py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm lg:text-base"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 lg:px-4 py-2 lg:py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm lg:text-base"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowMobileCart(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
              >
                <Menu className="w-5 h-5" />
                <span className="bg-white text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  {cart.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2 lg:p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
              {filteredProducts.map((product) => {
                const hasDiscount = product.discount;
                const discountedPrice = hasDiscount
                  ? product.price - (product.price * product.discount.percentage / 100)
                  : product.price;

                return (
                  <motion.button
                    key={product.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAddToCart(product)}
                    className="bg-white rounded-xl border border-neutral-200 p-3 lg:p-4 hover:shadow-lg transition-all text-left relative"
                  >
                    {hasDiscount && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                          -{product.discount.percentage}%
                        </div>
                      </div>
                    )}
                    <div className="aspect-square bg-neutral-100 rounded-lg mb-2 lg:mb-3 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-1 truncate text-sm lg:text-base">{product.name}</h3>
                    {hasDiscount ? (
                      <div className="mb-1">
                        <p className="text-neutral-400 line-through text-xs">KES {product.price.toLocaleString()}</p>
                        <p className="text-primary font-bold text-base lg:text-lg">KES {Math.round(discountedPrice).toLocaleString()}</p>
                        <p className="text-green-600 text-xs font-semibold">Save {product.discount.percentage}%</p>
                      </div>
                    ) : (
                      <p className="text-primary font-bold text-base lg:text-lg mb-1">KES {product.price.toLocaleString()}</p>
                    )}
                    <p className="text-xs lg:text-sm text-neutral-500">Stock: {product.stock}</p>
                  </motion.button>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-semibold mb-2 text-neutral-900">No Products Found</h3>
                <p className="text-neutral-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block w-96 border-l border-neutral-200">
          <CartPanel />
        </div>
      </div>

      {cart.length > 0 && !showMobileCart && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="lg:hidden fixed bottom-4 right-4 bg-primary text-white p-4 rounded-full shadow-lg z-40 flex items-center gap-2"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="bg-white text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            {cart.length}
          </span>
        </button>
      )}

      <AnimatePresence>
        {showMobileCart && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-50 shadow-2xl"
          >
            <CartPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">Complete Payment</h2>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-neutral-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-medium">KES {calculateSubtotal().toLocaleString()}</span>
                  </div>
                  {calculateDiscountTotal() > 0 && (
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-green-600">Discount</span>
                      <span className="font-medium text-green-600">-KES {calculateDiscountTotal().toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
                    <span>Total</span>
                    <span className="text-primary">KES {calculateTotal().toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handlePaymentMethodChange('cash')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-primary bg-primary/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Banknote className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === 'cash' ? 'text-primary' : 'text-neutral-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        paymentMethod === 'cash' ? 'text-primary' : 'text-neutral-600'
                      }`}>Cash</span>
                    </button>

                    <button
                      onClick={() => handlePaymentMethodChange('mpesa')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'mpesa'
                          ? 'border-primary bg-primary/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Smartphone className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === 'mpesa' ? 'text-primary' : 'text-neutral-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        paymentMethod === 'mpesa' ? 'text-primary' : 'text-neutral-600'
                      }`}>M-Pesa</span>
                    </button>

                    <button
                      onClick={() => handlePaymentMethodChange('card')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'card'
                          ? 'border-primary bg-primary/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                        paymentMethod === 'card' ? 'text-primary' : 'text-neutral-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        paymentMethod === 'card' ? 'text-primary' : 'text-neutral-600'
                      }`}>Card</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'mpesa' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="0712345678 or 254712345678"
                      value={mpesaPhoneNumber}
                      onChange={(e) => {
                        setMpesaPhoneNumber(e.target.value);
                        setPhoneError('');
                      }}
                      className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                        phoneError ? 'border-red-500' : 'border-neutral-200'
                      }`}
                      maxLength={12}
                    />
                    {phoneError && (
                      <p className="mt-2 text-sm text-red-600">{phoneError}</p>
                    )}
                    <p className="mt-2 text-xs text-neutral-500">
                      Enter the phone number that will receive the M-Pesa payment prompt
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReceipt && completedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">Order Complete!</h2>
                <button
                  onClick={() => {
                    setShowReceipt(false);
                    setCompletedOrder(null);
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-neutral-600">Payment processed successfully</p>
                <p className="text-2xl font-bold text-neutral-900 mt-2">
                  KES {completedOrder.total.toLocaleString()}
                </p>
              </div>

              <ReceiptPrinter
                {...completedOrder}
                onPrintComplete={() => {
                  setShowReceipt(false);
                  setCompletedOrder(null);
                }}
              />

              <button
                onClick={() => {
                  setShowReceipt(false);
                  setCompletedOrder(null);
                }}
                className="w-full mt-3 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSInterface;

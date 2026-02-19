import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Smartphone, Banknote, Package,
  LogOut, X, Maximize, Minimize, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DiscountCalculator from '../../components/pos/DiscountCalculator';
import ReceiptPrinter from '../../components/pos/ReceiptPrinter';
import { Product, CartItem } from '../../types';

// ── Fullscreen helpers (cross-browser + mobile) ───────────────────────────────
const fsEnter = (el: HTMLElement) => {
  if      (el.requestFullscreen)                el.requestFullscreen();
  else if ((el as any).webkitRequestFullscreen)  (el as any).webkitRequestFullscreen();
  else if ((el as any).mozRequestFullScreen)     (el as any).mozRequestFullScreen();
  else if ((el as any).msRequestFullscreen)      (el as any).msRequestFullscreen();
};
const fsExit = () => {
  if      (document.exitFullscreen)                document.exitFullscreen();
  else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
  else if ((document as any).mozCancelFullScreen)  (document as any).mozCancelFullScreen();
  else if ((document as any).msExitFullscreen)     (document as any).msExitFullscreen();
};
const fsElement = () =>
  document.fullscreenElement              ||
  (document as any).webkitFullscreenElement ||
  (document as any).mozFullScreenElement    ||
  (document as any).msFullscreenElement     ||
  null;
const fsSupported = () =>
  !!(document.documentElement.requestFullscreen ||
     (document.documentElement as any).webkitRequestFullscreen ||
     (document.documentElement as any).mozRequestFullScreen ||
     (document.documentElement as any).msRequestFullscreen);

// ── CartItemRow ────────────────────────────────────────────────────────────────
interface CartItemRowProps {
  item:        CartItem;
  onRemove:    (pid: string, vid?: string) => void;
  onUpdateQty: (pid: string, vid: string | undefined, delta: number) => void;
  onSetQty:    (pid: string, vid: string | undefined, qty: number) => void;
}

const CartItemRow = memo(({ item, onRemove, onUpdateQty, onSetQty }: CartItemRowProps) => {
  const [draft, setDraft] = useState(String(item.quantity));

  useEffect(() => { setDraft(String(item.quantity)); }, [item.quantity]);

  const commit = (raw: string) => {
    const n       = parseInt(raw.replace(/[^0-9]/g, ''), 10);
    const clamped = Math.max(1, Math.min(item.product.stock, isNaN(n) ? 1 : n));
    onSetQty(item.product.id, item.variant?.id, clamped);
    setDraft(String(clamped));
  };

  const inputW = Math.max(28, draft.replace(/[^0-9]/g, '').length * 11 + 12);

  return (
    <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-100">
      <div className="flex justify-between items-start mb-1.5 gap-2">
        <h3 style={{ color: '#171717' }} className="font-medium text-xs leading-snug flex-1">
          {item.product.name}
          {item.variant && (
            <span style={{ color: '#a3a3a3' }} className="font-normal"> · {item.variant.size}</span>
          )}
        </h3>
        <button
          onClick={() => onRemove(item.product.id, item.variant?.id)}
          style={{ color: '#d4d4d4' }}
          className="p-1 hover:text-red-500 active:text-red-600 transition-colors touch-manipulation flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div
          className="inline-flex items-center flex-shrink-0"
          style={{ height: 32, border: '1px solid #e5e5e5', borderRadius: 8, backgroundColor: '#ffffff' }}
        >
          <button
            onClick={() => onUpdateQty(item.product.id, item.variant?.id, -1)}
            disabled={item.quantity <= 1}
            className="flex items-center justify-center touch-manipulation
              hover:bg-neutral-100 active:bg-neutral-200 transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            style={{ width: 32, height: 32, color: '#737373', borderRight: '1px solid #e5e5e5',
              borderRadius: '7px 0 0 7px', background: 'transparent' }}
          >
            <Minus style={{ width: 12, height: 12 }} />
          </button>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onFocus={e  => e.target.select()}
            onBlur={e   => commit(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setDraft(String(item.quantity));
                (e.target as HTMLInputElement).blur();
              }
            }}
            style={{
              width: inputW, minWidth: 28, height: 32,
              textAlign: 'center', fontSize: 14, fontWeight: 700,
              color: '#171717', backgroundColor: 'transparent',
              border: 'none', outline: 'none', padding: '0 4px', fontFamily: 'inherit',
            }}
          />

          <button
            onClick={() => onUpdateQty(item.product.id, item.variant?.id, 1)}
            disabled={item.quantity >= item.product.stock}
            className="flex items-center justify-center touch-manipulation
              hover:bg-neutral-100 active:bg-neutral-200 transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            style={{ width: 32, height: 32, color: '#737373', borderLeft: '1px solid #e5e5e5',
              borderRadius: '0 7px 7px 0', background: 'transparent' }}
          >
            <Plus style={{ width: 12, height: 12 }} />
          </button>
        </div>

        <span style={{ color: '#171717', fontWeight: 700, fontSize: 12 }} className="tabular-nums flex-shrink-0">
          KES {(item.product.price * item.quantity).toLocaleString()}
        </span>
      </div>

      {item.quantity >= item.product.stock - 2 && item.product.stock > 0 && (
        <p className="text-[10px] text-amber-500 font-medium mt-1.5">
          Max: {item.product.stock} in stock
        </p>
      )}
    </div>
  );
});
CartItemRow.displayName = 'CartItemRow';

// ── CartPanel ──────────────────────────────────────────────────────────────────
interface CartPanelProps {
  cart:              CartItem[];
  onClose:           () => void;
  onClearCart:       () => void;
  onRemoveFromCart:  (productId: string, variantId?: string) => void;
  onUpdateQuantity:  (productId: string, variantId: string | undefined, delta: number) => void;
  onSetQuantity:     (productId: string, variantId: string | undefined, qty: number) => void;
  onDiscountApplied: (discounts: any[]) => void;
  onCheckout:        () => void;
  userId?:           string;
  subtotal:          number;
  discountTotal:     number;
  total:             number;
}

const CartPanel = memo(({
  cart, onClose, onClearCart, onRemoveFromCart, onUpdateQuantity, onSetQuantity,
  onDiscountApplied, onCheckout, userId, subtotal, discountTotal, total,
}: CartPanelProps) => (
  <div className="h-full bg-white flex flex-col">
    <div className="px-4 py-3 border-b border-neutral-200 flex-shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Cart
          <span className="text-xs font-normal text-neutral-400">
            ({cart.length} item{cart.length !== 1 ? 's' : ''})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={onClearCart} className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors touch-manipulation">
              Clear all
            </button>
          )}
          <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-neutral-100 active:bg-neutral-200 rounded-lg transition-colors touch-manipulation">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-auto">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
          <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
            <ShoppingCart className="w-6 h-6 text-neutral-300" />
          </div>
          <p className="text-sm text-neutral-500 font-medium">Cart is empty</p>
          <p className="text-xs text-neutral-400 mt-0.5">Tap a product to add it</p>
        </div>
      ) : (
        <>
          <div className="p-2.5 space-y-1.5">
            {cart.map(item => (
              <CartItemRow
                key={`${item.product.id}-${item.variant?.id || ''}`}
                item={item}
                onRemove={onRemoveFromCart}
                onUpdateQty={onUpdateQuantity}
                onSetQty={onSetQuantity}
              />
            ))}
          </div>
          <DiscountCalculator cartItems={cart} onDiscountApplied={onDiscountApplied} userId={userId} />
        </>
      )}
    </div>

    <div className="border-t border-neutral-200 p-3 space-y-3 flex-shrink-0">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-medium tabular-nums">KES {subtotal.toLocaleString()}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-emerald-600">Discount</span>
            <span className="font-medium text-emerald-600 tabular-nums">-KES {discountTotal.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold border-t border-neutral-100 pt-2 mt-1">
          <span>Total</span>
          <span className="tabular-nums text-neutral-900">KES {total.toLocaleString()}</span>
        </div>
      </div>
      <button
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="w-full py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white
          rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed
          flex items-center justify-center gap-2 font-semibold touch-manipulation text-sm"
      >
        <CreditCard className="w-4 h-4" />
        Proceed to Checkout
      </button>
    </div>
  </div>
));
CartPanel.displayName = 'CartPanel';

// ── Helpers ────────────────────────────────────────────────────────────────────
const QUICK_DENOMINATORS = [50, 100, 200, 500, 1000, 2000, 5000];
const quickAmounts = (total: number): number[] => {
  const rounded = QUICK_DENOMINATORS.map(d => Math.ceil(total / d) * d).filter(v => v >= total);
  return [...new Set([total, ...rounded])].slice(0, 5);
};

// ── POSInterface ───────────────────────────────────────────────────────────────
const POSInterface = () => {
  const navigate           = useNavigate();
  const user               = useStore(s => s.user);
  const cart               = useStore(s => s.cart);
  const addToCart          = useStore(s => s.addToCart);
  const removeFromCart     = useStore(s => s.removeFromCart);
  const updateCartQuantity = useStore(s => s.updateCartQuantity);
  const clearCart          = useStore(s => s.clearCart);
  const containerRef       = useRef<HTMLDivElement>(null);

  const [products,         setProducts]         = useState<Product[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [categoryFilter,   setCategoryFilter]   = useState('all');
  const [showCheckout,     setShowCheckout]     = useState(false);
  const [paymentMethod,    setPaymentMethod]    = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [processing,       setProcessing]       = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [showMobileCart,   setShowMobileCart]   = useState(false);
  const [isFullscreen,     setIsFullscreen]     = useState(false);
  const [canFullscreen,    setCanFullscreen]    = useState(false);
  const [completedOrder,   setCompletedOrder]   = useState<any>(null);
  const [showReceipt,      setShowReceipt]      = useState(false);
  const [addBump,          setAddBump]          = useState(0);

  const [mpesaPhone,   setMpesaPhone]   = useState('');
  const [phoneError,   setPhoneError]   = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [cashError,    setCashError]    = useState('');

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !['admin', 'worker'].includes(user.role)) navigate('/');
  }, [user, navigate]);

  useEffect(() => { fetchProducts(); }, []);

  // ── Fullscreen detection (all vendor prefixes) ───────────────────────────────
  useEffect(() => {
    setCanFullscreen(fsSupported());

    const onFsChange = () => setIsFullscreen(!!fsElement());
    document.addEventListener('fullscreenchange',       onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange',    onFsChange);
    document.addEventListener('MSFullscreenChange',     onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange',       onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange',    onFsChange);
      document.removeEventListener('MSFullscreenChange',     onFsChange);
    };
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products').select('*').gt('stock', 0).order('name');
      if (error) throw error;
      const now = new Date().toISOString();
      const { data: discounts } = await supabase.from('discounts').select('*')
        .lte('start_date', now).gte('end_date', now);
      setProducts((data ?? []).map(p => ({
        ...p,
        discount: discounts?.find(d => d.product_id === p.id) || null,
      })));
    } catch (err) { console.error('fetchProducts:', err); }
    finally { setLoading(false); }
  };

  // ── Fullscreen toggle ─────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    try {
      if (fsElement()) {
        fsExit();
      } else {
        // Must request on the document element (not a div) for reliable cross-browser support
        fsEnter(document.documentElement);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  // ── Exit POS — confirm if cart has items ─────────────────────────────────────
  const handleExitPOS = useCallback(() => {
    if (cart.length > 0) {
      const confirmed = window.confirm(
        `You have ${cart.length} item${cart.length !== 1 ? 's' : ''} in your cart.\n\nLeave anyway? Your cart will be cleared.`
      );
      if (!confirmed) return;
      clearCart();
    }
    // Exit fullscreen first if active, then navigate
    if (fsElement()) {
      fsExit();
      // Give browser time to exit fullscreen before navigating
      setTimeout(() => navigate('/admin/dashboard'), 150);
    } else {
      navigate('/admin/dashboard');
    }
  }, [cart, clearCart, navigate]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAddToCart = useCallback((product: Product) => {
    if (product.stock <= 0) { alert('Out of stock'); return; }
    const existing = cart.find(i => i.product.id === product.id);
    if (existing && existing.quantity >= product.stock) {
      alert('Cannot exceed available stock'); return;
    }
    addToCart({ product, quantity: 1 });
    setAddBump(n => n + 1);
  }, [cart, addToCart]);

  const handleRemoveFromCart  = useCallback((pid: string, vid?: string) =>
    removeFromCart(pid, vid), [removeFromCart]);

  const handleUpdateQuantity  = useCallback((pid: string, vid: string | undefined, delta: number) =>
    updateCartQuantity(pid, vid, delta), [updateCartQuantity]);

  const handleSetQuantity = useCallback((pid: string, vid: string | undefined, qty: number) => {
    const existing = cart.find(i => i.product.id === pid && i.variant?.id === vid);
    const delta    = qty - (existing?.quantity ?? 0);
    if (delta !== 0) updateCartQuantity(pid, vid, delta);
  }, [cart, updateCartQuantity]);

  const handleClearCart       = useCallback(() => clearCart(), [clearCart]);
  const handleOpenCheckout    = useCallback(() => setShowCheckout(true), []);
  const handleCloseMobileCart = useCallback(() => setShowMobileCart(false), []);
  const handleDiscountApplied = useCallback((d: any[]) => setAppliedDiscounts(d), []);

  const handlePaymentMethodChange = useCallback((method: 'cash' | 'mpesa' | 'card') => {
    setPaymentMethod(method);
    setPhoneError(''); setMpesaPhone('');
    setCashError('');  setCashTendered('');
  }, []);

  // ── Totals ───────────────────────────────────────────────────────────────────
  const subtotal      = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountTotal = appliedDiscounts.reduce((s, d) => s + d.savings, 0);
  const total         = subtotal - discountTotal;

  const cashNum    = Math.max(0, parseFloat(cashTendered.replace(/[^0-9.]/g, '')) || 0);
  const cashChange = Math.max(0, cashNum - total);
  const cashOk     = cashNum >= total && cashNum > 0;

  const validatePhone = (p: string) => /^(254|0)?[17]\d{8}$/.test(p.replace(/\s/g, ''));
  const formatPhone   = (p: string) => {
    let c = p.replace(/\s/g, '');
    if (c.startsWith('0'))    c = '254' + c.slice(1);
    if (c.startsWith('+254')) c = c.slice(1);
    if (!c.startsWith('254')) c = '254' + c;
    return c;
  };

  const resetPaymentState = () => {
    setMpesaPhone(''); setPhoneError('');
    setCashTendered(''); setCashError('');
  };

  // ── Checkout ─────────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) { alert('Cart is empty'); return; }
    if (paymentMethod === 'mpesa') {
      if (!mpesaPhone.trim()) { setPhoneError('Phone number required for M-Pesa'); return; }
      if (!validatePhone(mpesaPhone)) { setPhoneError('Invalid number. Use: 0712345678 or 254712345678'); return; }
      setPhoneError('');
    }
    if (paymentMethod === 'cash') {
      if (!cashTendered.trim() || cashNum === 0) { setCashError('Enter the cash amount received'); return; }
      if (cashNum < total) { setCashError(`Insufficient — need at least KES ${Math.ceil(total).toLocaleString()}`); return; }
      setCashError('');
    }

    setProcessing(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert([{ user_id: user?.id, status: 'pending', total, cashier_id: user?.id }])
        .select().single();
      if (orderErr) throw orderErr;

      const orderItems = cart.map(item => {
        const disc = appliedDiscounts.find(d => d.productId === item.product.id);
        return {
          order_id: order.id, product_id: item.product.id,
          variant_id: item.variant?.id || null, quantity: item.quantity,
          price: item.product.price,
          discount_amount: disc ? disc.discountAmount / item.quantity : 0,
        };
      });
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      let paymentStatus  = 'completed';
      let mpesaReference = null;

      if (paymentMethod === 'mpesa') {
        try {
          const { data: mpesaData, error: mpesaErr } = await supabase.functions.invoke('mpesa-payment', {
            body: { orderId: order.id, phoneNumber: formatPhone(mpesaPhone), amount: Math.round(total) },
          });
          if (mpesaErr || !mpesaData?.success) throw new Error(mpesaData?.message || 'M-Pesa failed');
          mpesaReference = mpesaData.data?.CheckoutRequestID || null;
          paymentStatus  = 'pending';
          alert('Payment request sent. Enter your M-Pesa PIN to complete.');
        } catch (e: any) { alert(`M-Pesa failed: ${e.message}`); throw e; }
      }

      const { error: payErr } = await supabase.from('payments').insert([{
        order_id: order.id, amount: total, payment_method: paymentMethod,
        status: paymentStatus, mpesa_reference: mpesaReference,
      }]);
      if (payErr) throw payErr;

      await supabase.from('orders')
        .update({ status: paymentMethod === 'mpesa' ? 'pending' : 'completed' })
        .eq('id', order.id);

      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id);
        await supabase.from('stock_logs').insert([{
          product_id: item.product.id, variant_id: item.variant?.id || null,
          previous_stock: item.product.stock, new_stock: newStock,
          change_type: 'sale', reason: `POS Sale - Order #${order.id}`, changed_by: user?.id,
        }]);
      }

      const receiptItems = cart.map(item => {
        const disc = appliedDiscounts.find(d => d.productId === item.product.id);
        const dpu  = disc ? disc.discountAmount / item.quantity : 0;
        return {
          name: item.product.name, quantity: item.quantity, price: item.product.price,
          discount: dpu, total: (item.product.price - dpu) * item.quantity,
        };
      });

      setCompletedOrder({
        orderId: order.id, items: receiptItems, subtotal,
        discount: discountTotal, total, paymentMethod,
        cashierEmail: user?.email || '',
        cashierName: (user as any)?.name || (user as any)?.full_name || undefined,
        date: new Date(),
        cashTendered: paymentMethod === 'cash' ? cashNum    : undefined,
        change:       paymentMethod === 'cash' ? cashChange : undefined,
      });

      clearCart();
      setShowCheckout(false);
      setAppliedDiscounts([]);
      setShowMobileCart(false);
      resetPaymentState();
      setShowReceipt(true);
      fetchProducts();
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.message || 'Failed to process order.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const categories       = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === 'all' || p.category === categoryFilter)
  );
  const cashQuickAmounts = quickAmounts(total);

  const cartPanelProps: CartPanelProps = {
    cart, onClose: handleCloseMobileCart, onClearCart: handleClearCart,
    onRemoveFromCart: handleRemoveFromCart, onUpdateQuantity: handleUpdateQuantity,
    onSetQuantity: handleSetQuantity, onDiscountApplied: handleDiscountApplied,
    onCheckout: handleOpenCheckout, userId: user?.id, subtotal, discountTotal, total,
  };

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="w-9 h-9 border-2 border-neutral-300 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-neutral-50">
      <div className="flex h-screen overflow-hidden">

        {/* ── Product column ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-white border-b border-neutral-200 px-3 sm:px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <h1 className="text-sm sm:text-base font-bold text-neutral-900">POS Terminal</h1>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:block text-xs text-neutral-400 max-w-[140px] truncate">
                  {user?.email}
                </span>

                {/* Fullscreen — only render if browser supports it */}
                {canFullscreen && (
                  <button
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                    className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300
                      transition-colors touch-manipulation"
                  >
                    {isFullscreen
                      ? <Minimize className="w-3.5 h-3.5 text-neutral-600" />
                      : <Maximize className="w-3.5 h-3.5 text-neutral-600" />}
                  </button>
                )}

                {/* Exit POS — confirms if cart has items, exits fullscreen first */}
                <button
                  onClick={handleExitPOS}
                  className="flex items-center gap-1 px-2 py-1.5 bg-neutral-100 hover:bg-neutral-200
                    active:bg-neutral-300 text-neutral-700 rounded-lg transition-colors
                    text-xs font-medium touch-manipulation"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit POS</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                  text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl
                    text-sm text-neutral-900 placeholder:text-neutral-400
                    focus:outline-none focus:ring-2 focus:ring-green-600/[0.12]
                    focus:border-green-400 transition-all"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl
                  text-xs sm:text-sm text-neutral-700 focus:outline-none focus:ring-2
                  focus:ring-green-600/[0.12] focus:border-green-400 transition-all
                  min-w-0 max-w-[100px] sm:max-w-[120px]"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-auto p-2 sm:p-3 lg:p-4">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
                gap-1.5 sm:gap-2 lg:gap-3">
                {filteredProducts.map(product => {
                  const hasDiscount     = !!product.discount;
                  const discountedPrice = hasDiscount
                    ? product.price - (product.price * product.discount.percentage / 100)
                    : product.price;
                  const inCart = cart.find(i => i.product.id === product.id);
                  return (
                    <motion.button
                      key={product.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddToCart(product)}
                      className={`bg-white rounded-xl border text-left relative
                        hover:border-green-300 hover:shadow-sm active:bg-neutral-50
                        transition-all touch-manipulation p-2 sm:p-2.5 lg:p-3
                        ${inCart ? 'border-green-300 ring-1 ring-green-300/50' : 'border-neutral-200'}`}
                    >
                      {hasDiscount && (
                        <div className="absolute top-1.5 right-1.5 z-10 bg-red-500 text-white
                          px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-bold leading-none">
                          -{product.discount.percentage}%
                        </div>
                      )}
                      {inCart && (
                        <div className="absolute top-1.5 left-1.5 z-10 bg-green-600 text-white
                          w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                          {inCart.quantity}
                        </div>
                      )}
                      <div className="aspect-square bg-neutral-100 rounded-lg mb-1.5 overflow-hidden">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <h3 className="font-semibold text-neutral-900 text-[10px] sm:text-xs leading-snug mb-0.5 line-clamp-2">
                        {product.name}
                      </h3>
                      {hasDiscount ? (
                        <div>
                          <p className="text-neutral-400 line-through text-[9px] sm:text-[10px] leading-none">
                            KES {product.price.toLocaleString()}
                          </p>
                          <p className="font-bold text-xs sm:text-sm text-green-700">
                            KES {Math.round(discountedPrice).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="font-bold text-xs sm:text-sm text-neutral-900">
                          KES {product.price.toLocaleString()}
                        </p>
                      )}
                      <p className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5">
                        Stock: {product.stock}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
                  <Package className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="font-semibold text-neutral-700 text-sm">No products found</p>
                <p className="text-xs text-neutral-400 mt-1">Try adjusting your search or filter</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop cart ─────────────────────────────────────────────────── */}
        <div className="hidden lg:block w-72 xl:w-80 border-l border-neutral-200 flex-shrink-0">
          <CartPanel {...cartPanelProps} />
        </div>
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={() => setShowMobileCart(true)}
            className="lg:hidden fixed z-40 touch-manipulation"
            style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))', right: '1rem' }}
          >
            <motion.div
              key={addBump}
              initial={addBump > 0 ? { scale: 1.22 } : { scale: 1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="flex items-center gap-2.5 pl-3 pr-4 py-3 bg-green-600 hover:bg-green-700
                active:bg-green-800 text-white rounded-full shadow-xl shadow-green-900/30 transition-colors"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white
                  rounded-full text-[9px] font-bold flex items-center justify-center border border-green-600">
                  {cart.length > 99 ? '99+' : cart.length}
                </span>
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[11px] font-semibold text-green-200">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm font-bold tabular-nums">KES {total.toLocaleString()}</span>
              </div>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showMobileCart && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseMobileCart}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="lg:hidden fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-50 shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <CartPanel {...cartPanelProps} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Checkout modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
              flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md
                max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="sm:hidden flex justify-center pt-2.5 pb-1">
                <div className="w-8 h-1 bg-neutral-300 rounded-full" />
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-neutral-900">Complete Payment</h2>
                  <button
                    onClick={() => { setShowCheckout(false); resetPaymentState(); }}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors touch-manipulation"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>

                <div className="bg-neutral-50 rounded-xl p-3 mb-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Subtotal</span>
                    <span className="font-medium tabular-nums">KES {subtotal.toLocaleString()}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600">Discount</span>
                      <span className="font-medium text-emerald-600 tabular-nums">-KES {discountTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-neutral-200 pt-2 mt-1">
                    <span>Total Due</span>
                    <span className="tabular-nums">KES {total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['cash', 'mpesa', 'card'] as const).map(method => {
                      const Icon   = method === 'cash' ? Banknote : method === 'mpesa' ? Smartphone : CreditCard;
                      const label  = method === 'mpesa' ? 'M-Pesa' : method.charAt(0).toUpperCase() + method.slice(1);
                      const active = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          onClick={() => handlePaymentMethodChange(method)}
                          className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2
                            transition-all touch-manipulation text-xs font-semibold
                            ${active
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-neutral-200 bg-white text-neutral-600 hover:border-green-400 active:bg-neutral-50'
                            }`}
                        >
                          <Icon className="w-4 h-4" />{label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence>
                  {paymentMethod === 'cash' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="space-y-2.5 pt-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                            Cash Received (KES)
                          </label>
                          <input
                            type="number" inputMode="decimal"
                            placeholder={`Min. ${Math.ceil(total).toLocaleString()}`}
                            value={cashTendered}
                            onChange={e => { setCashTendered(e.target.value); setCashError(''); }}
                            className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl text-neutral-900
                              text-xl font-bold tabular-nums focus:outline-none focus:ring-2
                              focus:ring-green-600/[0.12] focus:border-green-400 transition-all
                              ${cashError ? 'border-red-400 bg-red-50' : 'border-neutral-200'}`}
                          />
                          {cashError && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{cashError}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-400 mb-1.5">Quick amounts</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cashQuickAmounts.map(amount => (
                              <button
                                key={amount}
                                onClick={() => { setCashTendered(String(amount)); setCashError(''); }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border
                                  transition-all touch-manipulation
                                  ${cashNum === amount
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-green-400 active:bg-neutral-50'
                                  }`}
                              >
                                {amount === total ? 'Exact' : `KES ${amount.toLocaleString()}`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <AnimatePresence>
                          {cashNum > 0 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.97 }}
                              className={`flex items-center justify-between p-3 rounded-xl border
                                ${cashOk ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
                            >
                              <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${cashOk ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {cashOk ? 'Change Due' : 'Insufficient'}
                                </p>
                                <p className={`text-2xl font-bold tabular-nums mt-0.5 ${cashOk ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {cashOk ? `KES ${cashChange.toLocaleString()}` : `-KES ${(total - cashNum).toLocaleString()}`}
                                </p>
                              </div>
                              {cashOk && (
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {paymentMethod === 'mpesa' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="pt-1">
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                          M-Pesa Phone Number
                        </label>
                        <input
                          type="tel" inputMode="numeric" placeholder="0712345678"
                          value={mpesaPhone}
                          onChange={e => { setMpesaPhone(e.target.value); setPhoneError(''); }}
                          className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl text-neutral-900
                            focus:outline-none focus:ring-2 focus:ring-green-600/[0.12]
                            focus:border-green-400 transition-all text-sm
                            ${phoneError ? 'border-red-400 bg-red-50' : 'border-neutral-200'}`}
                          maxLength={12}
                        />
                        {phoneError && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{phoneError}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-neutral-400">Customer will receive an M-Pesa prompt</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCheckout(false); resetPaymentState(); }}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300
                      text-neutral-700 rounded-xl font-semibold transition-colors touch-manipulation text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={processing || (paymentMethod === 'cash' && cashNum > 0 && !cashOk)}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800
                      text-white rounded-xl font-semibold transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm"
                  >
                    {processing ? 'Processing…' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Receipt modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReceipt && completedOrder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
              flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md
                max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="sm:hidden flex justify-center pt-2.5 pb-1">
                <div className="w-8 h-1 bg-neutral-300 rounded-full" />
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-neutral-900">Order Complete</h2>
                  <button
                    onClick={() => { setShowReceipt(false); setCompletedOrder(null); }}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors touch-manipulation"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900 text-sm">Payment successful</p>
                    <p className="text-xl font-bold text-emerald-800 tabular-nums">
                      KES {completedOrder.total.toLocaleString()}
                    </p>
                    {completedOrder.paymentMethod === 'cash' && (completedOrder.change ?? 0) > 0 && (
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Change: <span className="font-bold">KES {completedOrder.change.toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                </div>
                <ReceiptPrinter
                  {...completedOrder}
                  onPrintComplete={() => { setShowReceipt(false); setCompletedOrder(null); }}
                  onClose={() => { setShowReceipt(false); setCompletedOrder(null); }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSInterface;

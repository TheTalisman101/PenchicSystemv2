import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import {
  CreditCard, Banknote, Store, Receipt, Calendar, Clock,
  ChevronLeft, Tag, Sparkles, CheckCircle, Printer
} from 'lucide-react';

// ── Discount helpers ──────────────────────────────────────────────────────────
const getDiscountedPrice = (product: any): number => {
  if (!product.discount?.percentage) return product.price;
  return Math.round(product.price - (product.price * product.discount.percentage) / 100);
};

// ── Shared sub-components ─────────────────────────────────────────────────────
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ title }: { title: string }) => (
  <div className="px-5 py-4 bg-[#f7faf8] border-b border-neutral-100">
    <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">{title}</p>
  </div>
);

const BackButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-2 text-sm text-neutral-500 hover:text-[#1a6b47] transition-colors font-medium"
  >
    <span className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center group-hover:border-[#a8dcc5] group-hover:bg-[#eaf5f0] transition-all">
      <ChevronLeft className="w-4 h-4" />
    </span>
    <span className="hidden sm:block">{label}</span>
  </button>
);

// ── Main Payment component ────────────────────────────────────────────────────
const Payment: React.FC = () => {
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showMpesa, setShowMpesa] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<{ paybill_number: string; account_number: string } | null>(null);

  const cartItems = useStore((state) => state.cart);
  const user = useStore((state) => state.user);
  const clearCart = useStore((state) => state.clearCart);
  const navigate = useNavigate();

  // ── Live cart totals ──────────────────────────────────────────────────────
  const subtotalOriginal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  );
  const totalDiscounted = cartItems.reduce(
    (sum, item) => sum + getDiscountedPrice(item.product) * item.quantity, 0
  );
  const totalSavings = subtotalOriginal - totalDiscounted;
  const hasAnyDiscount = totalSavings > 0;

  // ── Receipt totals (snapshot after cart cleared) ──────────────────────────
  const receiptOriginal = receiptItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  );
  const receiptTotal = receiptItems.reduce(
    (sum, item) => sum + getDiscountedPrice(item.product) * item.quantity, 0
  );
  const receiptSavings = receiptOriginal - receiptTotal;
  const receiptHasDiscount = receiptSavings > 0;

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      const { data, error } = await supabase
        .from('payment_info')
        .select('paybill_number, account_number')
        .single();
      if (error) {
        console.error('Error fetching payment info:', error);
        setError('Error loading payment information');
      } else {
        setPaymentInfo(data);
      }
    };
    fetchPaymentInfo();
  }, []);

  const generateReceiptNumber = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `RCP-${timestamp}-${random}`;
  };

  const handlePayment = (method: 'mpesa' | 'cash') => {
    if (method === 'mpesa') setShowMpesa(true);
    else setShowConfirmation(true);
  };

  const processOrder = async (paymentMethod: 'mpesa' | 'cash', cashAmount?: number) => {
    setLoading(true);
    setError(null);
    try {
      // Create order with discounted total
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ user_id: user?.id, total: totalDiscounted, status: 'pending' }])
        .select()
        .single();
      if (orderError) throw orderError;

      // Order items use discounted unit price
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        price: getDiscountedPrice(item.product),
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Cash: record payment + update order status
      if (paymentMethod === 'cash' && cashAmount !== undefined) {
        const { error: paymentError } = await supabase.from('payments').insert([{
          order_id: order.id,
          amount: cashAmount,
          payment_method: 'cash',
          status: 'completed',
        }]);
        if (paymentError) throw paymentError;

        const { error: updateError } = await supabase
          .from('orders').update({ status: 'processing' }).eq('id', order.id);
        if (updateError) throw updateError;
      }

      setReceiptItems([...cartItems]);
      setReceiptNumber(generateReceiptNumber());
      setShowReceipt(true);
      clearCart();
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMpesaPayment = () => processOrder('mpesa');

  const handleConfirmPayment = () => {
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount < totalDiscounted) {
      setError(`Please enter an amount of at least KES ${totalDiscounted.toLocaleString('en-KE')}.`);
      return;
    }
    processOrder('cash', amount);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RECEIPT
  // ══════════════════════════════════════════════════════════════════════════
  if (showReceipt) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const cashReceived = Number(paymentAmount);
    const change = cashReceived - receiptTotal;

    return (
      <div className="min-h-screen bg-[#f7faf8] py-10 px-4">
        <div className="max-w-md mx-auto space-y-4">

          {/* Success */}
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-16 h-16 rounded-full bg-[#eaf5f0] border-2 border-[#a8dcc5] flex items-center justify-center mb-3">
              <CheckCircle className="w-9 h-9 text-[#1a6b47]" />
            </div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Payment Successful!</h1>
            <p className="text-neutral-400 text-sm mt-1">Your order has been confirmed</p>
          </div>

          {/* Receipt */}
          <Card id="receipt">

            {/* Store header */}
            <div className="bg-[#1a6b47] px-6 py-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Penchic Farm</h2>
              <p className="text-green-200 text-xs mt-1">Limuru, Kiambu County</p>
              <p className="text-green-200 text-xs">Tel: +254 700 000 000</p>
            </div>

            {/* Meta */}
            <div className="px-5 py-4 border-b border-neutral-100 space-y-2">
              {[
                { icon: <Receipt className="w-3.5 h-3.5" />, label: 'Receipt No.', value: receiptNumber, mono: true },
                { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Date', value: formattedDate },
                { icon: <Clock className="w-3.5 h-3.5" />, label: 'Time', value: formattedTime },
              ].map(({ icon, label, value, mono }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-neutral-500">
                    {icon}
                    <span className="font-medium">{label}</span>
                  </div>
                  <span className={`text-neutral-800 text-xs font-semibold ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Items */}
            <div className="px-5 py-4">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-3">Items Purchased</p>
              <div className="space-y-4">
                {receiptItems.map((item, i) => {
                  const hasDiscount = !!item.product.discount?.percentage;
                  const unitPrice = getDiscountedPrice(item.product);
                  const lineTotal = unitPrice * item.quantity;
                  const lineSaved = (item.product.price - unitPrice) * item.quantity;

                  return (
                    <div key={i} className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-grow">
                        <p className="text-neutral-900 font-semibold text-sm leading-tight">
                          {item.product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.variant && (
                            <span className="text-neutral-400 text-xs">{item.variant.size} ·</span>
                          )}
                          <span className="text-neutral-400 text-xs">×{item.quantity}</span>
                          {hasDiscount && (
                            <span className="bg-red-50 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              -{item.product.discount.percentage}%
                            </span>
                          )}
                        </div>
                        {hasDiscount ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-neutral-600 text-xs font-medium">
                              KES {unitPrice.toLocaleString('en-KE')} / unit
                            </span>
                            <span className="text-neutral-400 text-xs line-through">
                              KES {item.product.price.toLocaleString('en-KE')}
                            </span>
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-xs mt-0.5">
                            KES {item.product.price.toLocaleString('en-KE')} / unit
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-neutral-900 font-bold text-sm">
                          KES {lineTotal.toLocaleString('en-KE')}
                        </p>
                        {hasDiscount && lineSaved > 0 && (
                          <p className="text-red-500 text-[10px] font-bold">
                            -{lineSaved.toLocaleString('en-KE')} saved
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 pb-5 pt-4 border-t border-neutral-100 space-y-2">
              {receiptHasDiscount && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Original subtotal</span>
                    <span className="text-neutral-400 line-through">
                      KES {receiptOriginal.toLocaleString('en-KE')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-red-600 font-bold">
                      <Tag className="w-3 h-3" /> Discounts
                    </span>
                    <span className="text-red-600 font-bold">
                      -KES {receiptSavings.toLocaleString('en-KE')}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-baseline pt-1 border-t border-neutral-100">
                <span className="font-bold text-neutral-700 text-sm">Total Charged</span>
                <span className="text-[1.3rem] font-extrabold text-neutral-900">
                  KES {receiptTotal.toLocaleString('en-KE')}
                </span>
              </div>

              {cashReceived > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 font-medium">Cash Received</span>
                    <span className="text-neutral-900 font-bold">
                      KES {cashReceived.toLocaleString('en-KE')}
                    </span>
                  </div>
                  {change > 0 && (
                    <div className="flex justify-between bg-[#eaf5f0] border border-[#a8dcc5] rounded-xl px-3 py-2">
                      <span className="text-[#1a6b47] font-bold text-sm">Change</span>
                      <span className="text-[#1a6b47] font-extrabold text-sm">
                        KES {change.toLocaleString('en-KE')}
                      </span>
                    </div>
                  )}
                </>
              )}

              {receiptHasDiscount && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-xs font-bold">
                    Customer saved KES {receiptSavings.toLocaleString('en-KE')} with discounts!
                  </p>
                </div>
              )}

              <div className="text-center text-neutral-400 text-xs pt-3 border-t border-neutral-100 space-y-1">
                <p className="font-semibold text-neutral-600">Thank you for shopping with us!</p>
                <p>Please keep this receipt for your records.</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 bg-white border-2 border-neutral-200 text-neutral-700 py-3 px-4 rounded-xl text-sm font-bold hover:border-neutral-400 hover:bg-neutral-50 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => navigate('/shop')}
              className="flex items-center justify-center gap-2 bg-[#1a6b47] text-white py-3 px-4 rounded-xl text-sm font-bold hover:bg-[#155a3b] transition-all shadow-md shadow-green-900/20"
            >
              New Sale →
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M-PESA
  // ══════════════════════════════════════════════════════════════════════════
  if (showMpesa) {
    return (
      <div className="min-h-screen bg-[#f7faf8] py-10 px-4">
        <div className="max-w-md mx-auto space-y-4">

          <div className="flex items-center gap-3 mb-2">
            <BackButton onClick={() => { setShowMpesa(false); setError(null); }} label="Back" />
            <h1 className="font-extrabold text-neutral-900 text-lg tracking-tight">M-Pesa Payment</h1>
          </div>

          {/* Amount */}
          <Card>
            <CardHeader title="Amount to Pay" />
            <div className="p-5 text-center">
              {hasAnyDiscount && (
                <p className="text-neutral-400 text-sm line-through mb-1">
                  KES {subtotalOriginal.toLocaleString('en-KE')}
                </p>
              )}
              <p className="text-[2.2rem] font-extrabold text-neutral-900 tracking-tight leading-none">
                KES {totalDiscounted.toLocaleString('en-KE')}
              </p>
              {hasAnyDiscount && (
                <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg mt-3">
                  <Tag className="w-3 h-3" />
                  Includes KES {totalSavings.toLocaleString('en-KE')} in discounts
                </div>
              )}
            </div>
          </Card>

          {/* Paybill */}
          <Card>
            <CardHeader title="Paybill Details" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f7faf8] rounded-xl p-4 border border-neutral-200 text-center">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Paybill No.</p>
                  <p className="text-xl font-mono font-extrabold text-neutral-900">
                    {paymentInfo?.paybill_number ?? '—'}
                  </p>
                </div>
                <div className="bg-[#f7faf8] rounded-xl p-4 border border-neutral-200 text-center">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Account No.</p>
                  <p className="text-xl font-mono font-extrabold text-neutral-900">
                    {paymentInfo?.account_number ?? '—'}
                  </p>
                </div>
              </div>

              <div className="bg-[#eaf5f0] border border-[#a8dcc5] rounded-xl p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#1a6b47] mb-3">How to Pay</p>
                <ol className="space-y-2">
                  {[
                    'Open M-PESA on your phone',
                    'Select Pay Bill',
                    `Enter Business no. ${paymentInfo?.paybill_number ?? '...'}`,
                    `Enter Account no. ${paymentInfo?.account_number ?? '...'}`,
                    `Enter Amount KES ${totalDiscounted.toLocaleString('en-KE')}`,
                    'Enter your M-PESA PIN and Send',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#1a6b47]">
                      <span className="w-5 h-5 rounded-full bg-[#1a6b47] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Card>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleMpesaPayment}
            disabled={loading}
            className="w-full bg-[#1a6b47] text-white py-4 rounded-xl text-sm font-bold hover:bg-[#155a3b] active:scale-[0.98] transition-all shadow-md shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : 'Generate Receipt'}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CASH
  // ══════════════════════════════════════════════════════════════════════════
  if (showConfirmation) {
    const cashAmount = Number(paymentAmount);
    const change = cashAmount - totalDiscounted;
    const isValidAmount = !isNaN(cashAmount) && cashAmount >= totalDiscounted;

    return (
      <div className="min-h-screen bg-[#f7faf8] py-10 px-4">
        <div className="max-w-md mx-auto space-y-4">

          <div className="flex items-center gap-3 mb-2">
            <BackButton onClick={() => { setShowConfirmation(false); setError(null); }} label="Back" />
            <h1 className="font-extrabold text-neutral-900 text-lg tracking-tight">Cash Payment</h1>
          </div>

          {/* Amount due */}
          <Card>
            <CardHeader title="Amount Due" />
            <div className="p-5 space-y-3">
              {hasAnyDiscount && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Original subtotal</span>
                    <span className="text-neutral-400 line-through">
                      KES {subtotalOriginal.toLocaleString('en-KE')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-red-600 font-bold">
                      <Tag className="w-3 h-3" /> Discounts
                    </span>
                    <span className="text-red-600 font-bold">
                      -KES {totalSavings.toLocaleString('en-KE')}
                    </span>
                  </div>
                  <div className="h-px bg-neutral-100" />
                </>
              )}
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-neutral-700 text-sm">
                  {hasAnyDiscount ? 'Total after discounts' : 'Total to Collect'}
                </span>
                <span className="text-[1.8rem] font-extrabold text-neutral-900 leading-none">
                  KES {totalDiscounted.toLocaleString('en-KE')}
                </span>
              </div>
            </div>
          </Card>

          {/* Cash input */}
          <Card>
            <CardHeader title="Cash Received" />
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block mb-2">
                  Enter amount received
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm pointer-events-none">
                    KES
                  </span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => { setPaymentAmount(Number(e.target.value)); setError(null); }}
                    min={totalDiscounted}
                    placeholder={totalDiscounted.toString()}
                    className="w-full h-14 pl-14 pr-4 rounded-xl border-2 border-neutral-200 bg-white text-lg font-extrabold text-neutral-900 focus:outline-none focus:border-[#2d9e6b] focus:ring-2 focus:ring-[#2d9e6b]/20 transition-all"
                  />
                </div>
              </div>

              {/* Change display */}
              {isValidAmount && (
                <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
                  change > 0 ? 'bg-[#eaf5f0] border-[#a8dcc5]' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className={`font-bold text-sm ${change > 0 ? 'text-[#1a6b47]' : 'text-neutral-600'}`}>
                    {change > 0 ? 'Change to give' : 'Exact amount'}
                  </span>
                  <span className={`font-extrabold text-lg ${change > 0 ? 'text-[#1a6b47]' : 'text-neutral-700'}`}>
                    KES {change.toLocaleString('en-KE')}
                  </span>
                </div>
              )}

              {paymentAmount !== '' && !isValidAmount && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-semibold">
                  Amount must be at least KES {totalDiscounted.toLocaleString('en-KE')}
                </div>
              )}
            </div>
          </Card>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirmPayment}
            disabled={loading || !isValidAmount}
            className="w-full bg-[#1a6b47] text-white py-4 rounded-xl text-sm font-bold hover:bg-[#155a3b] active:scale-[0.98] transition-all shadow-md shadow-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : `Confirm Payment — KES ${totalDiscounted.toLocaleString('en-KE')}`}
          </button>

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DEFAULT: CHOOSE METHOD
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f7faf8] py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">

        <div className="flex items-center gap-3 mb-2">
          <BackButton onClick={() => navigate('/checkout')} label="Back to Checkout" />
          <h1 className="font-extrabold text-neutral-900 text-lg tracking-tight">Payment</h1>
        </div>

        {/* Total */}
        <Card>
          <CardHeader title="Order Total" />
          <div className="p-5 space-y-3">
            {hasAnyDiscount && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Original subtotal</span>
                  <span className="text-neutral-400 line-through">
                    KES {subtotalOriginal.toLocaleString('en-KE')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-red-600 font-bold">
                    <Tag className="w-3 h-3" /> Discounts
                  </span>
                  <span className="text-red-600 font-bold">
                    -KES {totalSavings.toLocaleString('en-KE')}
                  </span>
                </div>
                <div className="h-px bg-neutral-100" />
              </>
            )}
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-neutral-700 text-sm">
                {hasAnyDiscount ? 'Total after discounts' : 'Total'}
              </span>
              <span className="text-[1.8rem] font-extrabold text-neutral-900 leading-none">
                KES {totalDiscounted.toLocaleString('en-KE')}
              </span>
            </div>
            {hasAnyDiscount && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-xs font-bold">
                  Saving KES {totalSavings.toLocaleString('en-KE')} with discounts
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Method selector */}
        <Card>
          <CardHeader title="Choose Payment Method" />
          <div className="p-5 space-y-3">
            <button
              onClick={() => handlePayment('mpesa')}
              className="w-full group flex items-center gap-4 bg-[#eaf5f0] border-2 border-[#a8dcc5] hover:border-[#2d9e6b] hover:bg-[#d6f0e5] p-4 rounded-xl transition-all active:scale-[0.98]"
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

            <button
              onClick={() => handlePayment('cash')}
              className="w-full group flex items-center gap-4 bg-neutral-50 border-2 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-100 p-4 rounded-xl transition-all active:scale-[0.98]"
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
        </Card>

      </div>
    </div>
  );
};

export default Payment;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import {
  ShoppingBag, CreditCard, Banknote, ChevronLeft, Tag,
  Sparkles, Package, Phone, CheckCircle, X, AlertCircle,
  ArrowRight, Loader,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Discount helper ──────────────────────────────────────────────────────────
const getDiscountedPrice = (product: any): number => {
  if (!product.discount?.percentage) return product.price;
  return Math.round(product.price - (product.price * product.discount.percentage) / 100);
};

// ── Inline toast ─────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error'; }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };
  const remove = (id: number) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, add, remove };
}
function Toaster({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
          borderRadius: 16, background: '#fff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: `1px solid ${t.type === 'success' ? '#b7e4c7' : '#fca5a5'}`,
          borderLeft: `3px solid ${t.type === 'success' ? '#40916c' : '#ef4444'}`,
          minWidth: 260, maxWidth: 340, pointerEvents: 'all',
          animation: 'toastIn .28s cubic-bezier(0.16,1,0.3,1)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {t.type === 'success'
            ? <CheckCircle size={17} color="#40916c" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertCircle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2419', marginBottom: 2 }}>
              {t.type === 'success' ? 'Success' : 'Error'}
            </div>
            <div style={{ fontSize: 12, color: '#6b8c77', lineHeight: 1.5 }}>{t.message}</div>
          </div>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0b8aa', padding: 2, display: 'flex', borderRadius: 6 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
type PaymentMethod = 'mpesa' | 'cash' | null;
type CheckoutStep  = 'review' | 'processing' | 'done';

const Checkout = () => {
  const cartItems  = useStore(s => s.cart);
  const clearCart  = useStore(s => s.clearCart);
  const user       = useStore(s => s.user);
  const navigate   = useNavigate();
  const { toasts, add: addToast, remove: removeToast } = useToast();

  const [method,      setMethod]      = useState<PaymentMethod>(null);
  const [mpesaPhone,  setMpesaPhone]  = useState('');
  const [mpesaCode,   setMpesaCode]   = useState('');
  const [step,        setStep]        = useState<CheckoutStep>('review');
  const [phoneError,  setPhoneError]  = useState('');

  const canUseCart = user && ['admin', 'worker'].includes(user.role);

  useEffect(() => {
    if (!canUseCart) navigate('/');
  }, [canUseCart, navigate]);

  if (!canUseCart) return null;

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotalOriginal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalDiscounted  = cartItems.reduce((s, i) => s + getDiscountedPrice(i.product) * i.quantity, 0);
  const totalSavings     = subtotalOriginal - totalDiscounted;
  const hasAnyDiscount   = totalSavings > 0;

  // ── Validation ────────────────────────────────────────────────────────────
  const validatePhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) return 'Phone number is required';
    if (cleaned.length < 9 || cleaned.length > 13) return 'Enter a valid Kenyan number (e.g. 0712 345678)';
    return '';
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (method === 'mpesa') {
      const err = validatePhone(mpesaPhone);
      if (err) { setPhoneError(err); return; }
    }

    setStep('processing');

    try {
      // Build order record
      const orderLines = cartItems.map(item => ({
        product_id:   item.product.id,
        product_name: item.product.name,
        variant_id:   item.variant?.id ?? null,
        quantity:     item.quantity,
        unit_price:   getDiscountedPrice(item.product),
        total_price:  getDiscountedPrice(item.product) * item.quantity,
      }));

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id:        user.id,
          payment_method: method,
          mpesa_phone:    method === 'mpesa' ? mpesaPhone.replace(/\D/g, '') : null,
          mpesa_code:     method === 'mpesa' && mpesaCode ? mpesaCode.trim() : null,
          total_amount:   totalDiscounted,
          status:         method === 'cash' ? 'pending_cash' : 'pending_mpesa',
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert line items
      const { error: lineError } = await supabase
        .from('order_items')
        .insert(orderLines.map(l => ({ ...l, order_id: order.id })));

      if (lineError) throw lineError;

      // Deduct stock
      for (const item of cartItems) {
        await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id);
      }

      clearCart();
      setStep('done');

    } catch (err: any) {
      console.error(err);
      addToast(err.message ?? 'Order failed. Please try again.', 'error');
      setStep('review');
    }
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
        `}</style>
        <div style={{
          minHeight: '100vh', background: '#f8faf9', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{
              width: 88, height: 88, borderRadius: 24, background: '#d8f3dc',
              border: '1px solid #b7e4c7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 24px',
            }}>
              <CheckCircle size={44} color="#2d6a4f" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#0d2419', marginBottom: 10 }}>
              Order Placed!
            </h2>
            <p style={{ fontSize: 14, color: '#6b8c77', lineHeight: 1.7, marginBottom: 28 }}>
              {method === 'mpesa'
                ? `Your M-Pesa order has been recorded. We'll confirm once payment is received on ${mpesaPhone}.`
                : 'Your cash order has been placed. Please complete payment when collecting your items.'}
            </p>
            <button
              onClick={() => navigate('/shop')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #40916c, #2d6a4f)',
                color: '#fff', fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(45,106,79,0.3)',
              }}
            >
              Continue Shopping <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap'); *,*::before,*::after{box-sizing:border-box}`}</style>
        <div style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ textAlign: 'center', maxWidth: 300 }}>
            <div style={{ width: 88, height: 88, borderRadius: 24, background: '#f0f7f3', border: '1px solid #b7e4c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <ShoppingBag size={40} color="#40916c" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#0d2419', marginBottom: 10 }}>Cart is empty</h2>
            <p style={{ fontSize: 14, color: '#6b8c77', lineHeight: 1.7, marginBottom: 28 }}>Add some items before checking out.</p>
            <button onClick={() => navigate('/shop')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #40916c, #2d6a4f)', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Browse Shop
            </button>
          </div>
        </div>
      </>
    );
  }

  const isProcessing = step === 'processing';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .co-root { min-height: 100vh; background: #f8faf9; font-family: 'DM Sans', sans-serif; color: #0d2419; }

        /* Header */
        .co-header {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(16px);
          border-bottom: 1px solid #e8f2ec;
          box-shadow: 0 1px 12px rgba(13,36,25,0.06);
        }
        .co-header-inner {
          max-width: 1100px; margin: 0 auto; padding: 0 24px;
          height: 64px; display: flex; align-items: center; gap: 12px;
        }
        @media (min-width: 1024px) { .co-header-inner { padding: 0 40px; } }

        .co-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 14px 0 10px; height: 38px; border-radius: 12px;
          border: 1.5px solid #d4e8db; background: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: #4a7c5f; cursor: pointer; transition: all .2s;
        }
        .co-back:hover { border-color: #40916c; background: #f0f7f3; color: #2d6a4f; }

        .co-steps { display: flex; align-items: center; gap: 8px; margin-left: auto; font-size: 12px; font-weight: 600; }
        .co-step-done  { color: #a0b8aa; }
        .co-step-active { color: #2d6a4f; font-weight: 800; }
        .co-step-line  { width: 28px; height: 1px; background: #d4e8db; }

        /* Savings banner */
        .co-savings-bar {
          background: linear-gradient(135deg, #ef4444, #e11d48);
          padding: 10px 24px;
        }
        .co-savings-inner {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 700; color: #fff;
        }
        @media (min-width: 1024px) { .co-savings-inner { padding: 0 16px; } }

        /* Body */
        .co-body { max-width: 1100px; margin: 0 auto; padding: 36px 24px 80px; }
        @media (min-width: 1024px) { .co-body { padding: 36px 40px 80px; } }

        .co-grid {
          display: grid; gap: 24px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 900px) { .co-grid { grid-template-columns: 1fr 360px; align-items: start; } }

        /* Section label */
        .co-section-label {
          display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
        }
        .co-section-dot { width: 6px; height: 6px; border-radius: 50%; background: #40916c; }
        .co-section-text { font-size: 10px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #a0b8aa; }

        /* Order item card */
        .co-item-card {
          background: #fff; border-radius: 18px; overflow: hidden;
          border: 1px solid #e2ede8; margin-bottom: 12px;
          transition: box-shadow .2s;
        }
        .co-item-card:hover { box-shadow: 0 4px 20px rgba(13,36,25,0.07); }
        .co-item-card.discounted { border-color: #fca5a5; }

        .co-item-ribbon {
          background: linear-gradient(to right, #fff5f5, #fff0f0);
          border-bottom: 1px solid #fee2e2;
          padding: 8px 16px; display: flex; align-items: center; gap: 8px;
          font-size: 12px; font-weight: 700; color: #dc2626;
        }

        .co-item-body { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
        .co-item-thumb {
          width: 68px; height: 68px; border-radius: 12px;
          overflow: hidden; background: #f0f7f3;
          border: 1px solid #e2ede8; flex-shrink: 0; position: relative;
        }
        .co-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .co-item-disc-tag {
          position: absolute; top: 5px; left: 5px;
          background: #ef4444; color: #fff;
          font-size: 9px; font-weight: 800; padding: 2px 6px;
          border-radius: 6px;
        }
        .co-item-name  { font-size: 14px; font-weight: 700; color: #0d2419; margin-bottom: 4px; }
        .co-item-meta  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .co-item-qty   { font-size: 12px; color: #a0b8aa; font-weight: 600; }
        .co-item-variant {
          font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px;
          background: #f0f7f3; color: #2d6a4f; border: 1px solid #b7e4c7;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .co-item-unit  { font-size: 12px; color: #a0b8aa; margin-top: 4px; }
        .co-item-unit-disc { font-size: 12px; font-weight: 700; color: #0d2419; }
        .co-item-unit-orig { font-size: 11px; color: #a0b8aa; text-decoration: line-through; margin-left: 4px; }
        .co-item-total {
          margin-left: auto; text-align: right; flex-shrink: 0;
        }
        .co-item-total-price { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; color: #0d2419; }
        .co-item-total-save  { font-size: 10px; color: #ef4444; font-weight: 700; margin-top: 2px; }

        /* Right panel */
        .co-right { display: flex; flex-direction: column; gap: 20px; }
        @media (min-width: 900px) { .co-right { position: sticky; top: 80px; } }

        /* Price card */
        .co-price-card { background: #fff; border: 1px solid #e2ede8; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(13,36,25,0.06); }
        .co-price-card-head { padding: 14px 20px; background: #f8faf9; border-bottom: 1px solid #e8f2ec; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #a0b8aa; }
        .co-price-card-body { padding: 20px; }
        .co-price-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; font-size: 13px; }
        .co-price-label { color: #6b8c77; font-weight: 500; }
        .co-price-value { font-weight: 700; color: #0d2419; }
        .co-price-save  { color: #ef4444; font-weight: 700; }
        .co-price-save-pill {
          display: flex; align-items: center; gap: 7px;
          background: #fff5f5; border: 1px solid #fca5a5;
          border-radius: 10px; padding: 8px 12px; margin-bottom: 14px;
          font-size: 12px; font-weight: 700; color: #dc2626;
        }
        .co-price-divider { height: 1px; background: #f0f7f3; margin: 14px 0; }
        .co-price-total-row { display: flex; justify-content: space-between; align-items: center; }
        .co-price-total-label { font-size: 13px; font-weight: 700; color: #4a7c5f; }
        .co-price-total-value { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #0d2419; letter-spacing: -0.5px; }

        /* Payment method card */
        .co-pay-card { background: #fff; border: 1px solid #e2ede8; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(13,36,25,0.06); }
        .co-pay-card-head { padding: 14px 20px; background: #f8faf9; border-bottom: 1px solid #e8f2ec; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #a0b8aa; }
        .co-pay-card-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

        .co-method-btn {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 14px; cursor: pointer;
          border: 2px solid #e2ede8; background: #fff;
          transition: all .2s ease; text-align: left; width: 100%;
          font-family: 'DM Sans', sans-serif;
        }
        .co-method-btn:hover:not(.selected):not(:disabled) { border-color: #b7e4c7; background: #f8faf9; }
        .co-method-btn.selected.mpesa { border-color: #40916c; background: #f0f7f3; }
        .co-method-btn.selected.cash  { border-color: #6b7280; background: #f9fafb; }
        .co-method-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .co-method-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .co-method-icon.mpesa { background: linear-gradient(135deg, #40916c, #2d6a4f); box-shadow: 0 4px 12px rgba(45,106,79,0.25); }
        .co-method-icon.cash  { background: linear-gradient(135deg, #374151, #1f2937); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

        .co-method-title { font-size: 14px; font-weight: 700; color: #0d2419; line-height: 1.2; }
        .co-method-sub   { font-size: 12px; color: #a0b8aa; font-weight: 500; margin-top: 2px; }

        .co-method-check {
          margin-left: auto; width: 20px; height: 20px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .co-method-check.mpesa { background: #2d6a4f; }
        .co-method-check.cash  { background: #374151; }

        /* M-Pesa form */
        .co-mpesa-form {
          background: #f0f7f3; border: 1.5px solid #b7e4c7;
          border-radius: 14px; padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .co-mpesa-title { font-size: 12px; font-weight: 700; color: #2d6a4f; margin-bottom: 2px; }
        .co-mpesa-sub   { font-size: 11px; color: #6b8c77; line-height: 1.5; }

        .co-field-label { font-size: 11px; font-weight: 700; color: #4a7c5f; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
        .co-field-required { color: #ef4444; }
        .co-field-wrap { position: relative; }
        .co-field-prefix {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          font-size: 13px; font-weight: 600; color: #6b8c77; pointer-events: none;
        }
        .co-field-input {
          width: 100%; height: 42px; border: 1.5px solid #d4e8db; border-radius: 11px;
          background: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px;
          font-weight: 600; color: #0d2419; outline: none;
          padding: 0 14px 0 40px; transition: border-color .2s, box-shadow .2s;
        }
        .co-field-input.no-prefix { padding-left: 14px; }
        .co-field-input:focus { border-color: #40916c; box-shadow: 0 0 0 4px rgba(64,145,108,0.1); }
        .co-field-input.error { border-color: #ef4444; }
        .co-field-error { font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 4px; }

        /* Cash info */
        .co-cash-info {
          background: #f9fafb; border: 1.5px solid #e5e7eb;
          border-radius: 14px; padding: 16px; font-size: 13px; color: #4b5563; line-height: 1.6;
        }
        .co-cash-info strong { color: #0d2419; display: block; font-weight: 700; margin-bottom: 6px; }

        /* Confirm button */
        .co-confirm-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 15px; border-radius: 16px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700;
          color: #fff; transition: all .25s ease;
          background: linear-gradient(135deg, #40916c, #1b4332);
          box-shadow: 0 6px 24px rgba(45,106,79,0.3);
        }
        .co-confirm-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(45,106,79,0.4); }
        .co-confirm-btn:active:not(:disabled) { transform: translateY(0); }
        .co-confirm-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

        .co-confirm-hint { text-align: center; font-size: 11px; color: #a0b8aa; font-weight: 500; margin-top: 8px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .co-spinner { width: 17px; height: 17px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; animation: spin .7s linear infinite; }
      `}</style>

      <div className="co-root">

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <header className="co-header">
          <div className="co-header-inner">
            <button className="co-back" onClick={() => navigate('/cart')}>
              <ChevronLeft size={15} /> Back to Cart
            </button>
            <div className="co-steps">
              <span className="co-step-done">Cart</span>
              <span className="co-step-line" />
              <span className="co-step-active">Checkout</span>
            </div>
          </div>
        </header>

        {/* Savings banner */}
        {hasAnyDiscount && (
          <div className="co-savings-bar">
            <div className="co-savings-inner">
              <Sparkles size={14} style={{ flexShrink: 0 }} />
              You're saving{' '}
              <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
                KES {totalSavings.toLocaleString('en-KE')}
              </span>{' '}
              with active discounts!
            </div>
          </div>
        )}

        {/* ══ BODY ══════════════════════════════════════════════════════════ */}
        <main className="co-body">
          <div className="co-grid">

            {/* ── Left: Order items ── */}
            <div>
              <div className="co-section-label">
                <div className="co-section-dot" />
                <Package size={13} color="#a0b8aa" />
                <span className="co-section-text">Order Summary</span>
              </div>

              {cartItems.map(item => {
                const hasDis     = !!item.product.discount?.percentage;
                const unitPrice  = getDiscountedPrice(item.product);
                const lineTotal  = unitPrice * item.quantity;
                const lineSaving = (item.product.price - unitPrice) * item.quantity;

                return (
                  <div
                    key={`${item.product.id}-${item.variant?.id ?? 'default'}`}
                    className={`co-item-card ${hasDis ? 'discounted' : ''}`}
                  >
                    {hasDis && (
                      <div className="co-item-ribbon">
                        <Tag size={12} style={{ flexShrink: 0 }} />
                        {item.product.discount.percentage}% discount applied
                        {item.quantity > 1 && ` — saving KES ${lineSaving.toLocaleString('en-KE')} here`}
                      </div>
                    )}
                    <div className="co-item-body">
                      <div className="co-item-thumb">
                        <img src={item.product.image_url} alt={item.product.name} />
                        {hasDis && (
                          <span className="co-item-disc-tag">-{item.product.discount.percentage}%</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="co-item-name">{item.product.name}</div>
                        <div className="co-item-meta">
                          <span className="co-item-qty">×{item.quantity}</span>
                          {item.variant && (
                            <span className="co-item-variant">{item.variant.size}</span>
                          )}
                        </div>
                        {hasDis ? (
                          <div style={{ marginTop: 5 }}>
                            <span className="co-item-unit-disc">KES {unitPrice.toLocaleString('en-KE')}</span>
                            <span className="co-item-unit-orig">KES {item.product.price.toLocaleString('en-KE')}</span>
                            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginLeft: 4 }}>/ unit</span>
                          </div>
                        ) : (
                          <div className="co-item-unit">KES {item.product.price.toLocaleString('en-KE')} / unit</div>
                        )}
                      </div>
                      <div className="co-item-total">
                        <div className="co-item-total-price">KES {lineTotal.toLocaleString('en-KE')}</div>
                        {hasDis && lineSaving > 0 && (
                          <div className="co-item-total-save">-KES {lineSaving.toLocaleString('en-KE')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Right: totals + payment ── */}
            <div className="co-right">

              {/* Price breakdown */}
              <div className="co-price-card">
                <div className="co-price-card-head">Price Breakdown</div>
                <div className="co-price-card-body">
                  {hasAnyDiscount && (
                    <>
                      <div className="co-price-row">
                        <span className="co-price-label">Original subtotal</span>
                        <span style={{ color: '#a0b8aa', textDecoration: 'line-through', fontWeight: 600 }}>
                          KES {subtotalOriginal.toLocaleString('en-KE')}
                        </span>
                      </div>
                      <div className="co-price-row" style={{ marginBottom: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 700, fontSize: 13 }}>
                          <Tag size={12} /> Discounts
                        </span>
                        <span className="co-price-save">-KES {totalSavings.toLocaleString('en-KE')}</span>
                      </div>
                      <div className="co-price-save-pill">
                        <Sparkles size={13} style={{ flexShrink: 0 }} />
                        Saving KES {totalSavings.toLocaleString('en-KE')} on this order
                      </div>
                      <div className="co-price-divider" />
                    </>
                  )}
                  <div className="co-price-total-row">
                    <span className="co-price-total-label">
                      {hasAnyDiscount ? 'Total after discounts' : 'Total'}
                    </span>
                    <span className="co-price-total-value">
                      KES {totalDiscounted.toLocaleString('en-KE')}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Payment method (select once, right here) ── */}
              <div className="co-pay-card">
                <div className="co-pay-card-head">Payment Method</div>
                <div className="co-pay-card-body">

                  {/* M-Pesa option */}
                  <button
                    className={`co-method-btn ${method === 'mpesa' ? 'selected mpesa' : ''}`}
                    onClick={() => setMethod(method === 'mpesa' ? null : 'mpesa')}
                    disabled={isProcessing}
                  >
                    <div className="co-method-icon mpesa">
                      <CreditCard size={18} color="#fff" />
                    </div>
                    <div>
                      <div className="co-method-title">M-Pesa</div>
                      <div className="co-method-sub">Pay via mobile money</div>
                    </div>
                    {method === 'mpesa' && (
                      <div className="co-method-check mpesa">
                        <CheckCircle size={12} color="#fff" />
                      </div>
                    )}
                  </button>

                  {/* M-Pesa inline form */}
                  {method === 'mpesa' && (
                    <div className="co-mpesa-form">
                      <div>
                        <div className="co-mpesa-title">M-Pesa Details</div>
                        <div className="co-mpesa-sub">
                          Enter the phone number to receive the STK push or confirm the transaction code if you've already paid.
                        </div>
                      </div>

                      <div>
                        <div className="co-field-label">
                          <Phone size={11} />
                          Phone Number <span className="co-field-required">*</span>
                        </div>
                        <div className="co-field-wrap">
                          <span className="co-field-prefix">📞</span>
                          <input
                            type="tel"
                            className={`co-field-input ${phoneError ? 'error' : ''}`}
                            placeholder="0712 345 678"
                            value={mpesaPhone}
                            onChange={e => { setMpesaPhone(e.target.value); setPhoneError(''); }}
                            disabled={isProcessing}
                          />
                        </div>
                        {phoneError && <div className="co-field-error">{phoneError}</div>}
                      </div>

                      <div>
                        <div className="co-field-label">
                          M-Pesa Code <span style={{ color: '#a0b8aa', fontWeight: 400 }}>(optional)</span>
                        </div>
                        <input
                          type="text"
                          className="co-field-input no-prefix"
                          placeholder="e.g. QHX3KD8901"
                          value={mpesaCode}
                          onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                          disabled={isProcessing}
                          maxLength={12}
                          style={{ fontFamily: 'monospace', letterSpacing: 1 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Cash option */}
                  <button
                    className={`co-method-btn ${method === 'cash' ? 'selected cash' : ''}`}
                    onClick={() => setMethod(method === 'cash' ? null : 'cash')}
                    disabled={isProcessing}
                  >
                    <div className="co-method-icon cash">
                      <Banknote size={18} color="#fff" />
                    </div>
                    <div>
                      <div className="co-method-title">Cash</div>
                      <div className="co-method-sub">Pay in person</div>
                    </div>
                    {method === 'cash' && (
                      <div className="co-method-check cash">
                        <CheckCircle size={12} color="#fff" />
                      </div>
                    )}
                  </button>

                  {/* Cash inline info */}
                  {method === 'cash' && (
                    <div className="co-cash-info">
                      <strong>Pay on collection</strong>
                      Your order will be prepared and held. Please bring exact change of{' '}
                      <strong style={{ display: 'inline', fontSize: 14, color: '#2d6a4f' }}>
                        KES {totalDiscounted.toLocaleString('en-KE')}
                      </strong>{' '}
                      when collecting your items.
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm button */}
              <div>
                <button
                  className="co-confirm-btn"
                  onClick={handleConfirm}
                  disabled={!method || isProcessing}
                >
                  {isProcessing ? (
                    <><div className="co-spinner" /> Processing order…</>
                  ) : (
                    <>
                      {method === 'mpesa' && <CreditCard size={16} />}
                      {method === 'cash'  && <Banknote   size={16} />}
                      {!method && <ShoppingBag size={16} />}
                      {method === 'mpesa' ? 'Confirm M-Pesa Order' : method === 'cash' ? 'Confirm Cash Order' : 'Select a payment method'}
                      {method && <ArrowRight size={15} />}
                    </>
                  )}
                </button>
                <p className="co-confirm-hint">
                  {method === 'mpesa'
                    ? 'Order will be confirmed once payment is received'
                    : method === 'cash'
                    ? 'Staff will prepare your order immediately'
                    : 'Choose M-Pesa or Cash above to continue'}
                </p>
              </div>

            </div>
          </div>
        </main>
      </div>

      <Toaster toasts={toasts} remove={removeToast} />
    </>
  );
};

export default Checkout;

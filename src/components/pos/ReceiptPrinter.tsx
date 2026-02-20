import React, { useState } from 'react';
import { Printer, X, Share2, CheckCircle2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface ReceiptProps {
  orderId: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  transactionId?: string;
  cashierEmail: string;
  cashierName?: string;
  date: Date;
  cashTendered?: number;
  change?: number;
  onPrintComplete?: () => void;
  onClose?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-KE');
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const canShare = () => typeof navigator.share === 'function';

const ReceiptPrinter: React.FC<ReceiptProps> = ({
  orderId, items, subtotal, discount, total,
  paymentMethod, transactionId, cashierEmail, cashierName,
  date, cashTendered, change, onPrintComplete, onClose,
}) => {
  const [status, setStatus] = useState<'idle' | 'printing' | 'done' | 'ios-hint'>('idle');

  const displayName = cashierName
    || cashierEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // ── Build receipt HTML ────────────────────────────────────────────────────
  const buildHtml = () => {
    const cashRows = paymentMethod === 'cash' && cashTendered !== undefined ? `
      <div class="divider-thin"></div>
      <div class="row"><span>Cash Tendered:</span><span>KES ${fmt(cashTendered)}</span></div>
      <div class="row ${(change ?? 0) > 0 ? 'bold amber' : 'muted'}">
        <span>Change:</span><span>KES ${fmt(change ?? 0)}</span>
      </div>` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Receipt-${orderId.slice(0,8).toUpperCase()}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',Courier,monospace;font-size:12px;color:#000;background:#fff;padding:16px;max-width:320px;margin:auto}
    .center{text-align:center}
    .bold{font-weight:bold}
    .amber{color:#b45309}
    .muted{color:#555}
    .green{color:#166534}
    .divider{border-top:2px solid #000;margin:10px 0}
    .divider-thin{border-top:1px dashed #777;margin:6px 0}
    .row{display:flex;justify-content:space-between;margin-bottom:3px;gap:8px}
    .row span:last-child{text-align:right;flex-shrink:0}
    .row-header{display:flex;justify-content:space-between;font-weight:bold;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:8px}
    .item{margin-bottom:8px}
    .item-meta{font-size:10px;color:#444;display:flex;justify-content:space-between}
    .item-disc{font-size:10px;color:#166534}
    .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:15px;border-top:2px solid #000;padding-top:6px;margin-top:6px}
    .footer{text-align:center;margin-top:14px;font-size:10px;line-height:1.9;color:#333}
    @media print{
      body{max-width:100%;padding:8px}
      @page{margin:4mm;size:80mm auto}
    }
  </style>
</head>
<body>
  <div class="center" style="margin-bottom:14px">
    <div class="bold" style="font-size:17px;letter-spacing:2px">PENCHIC FARM</div>
    <div style="font-size:10px;color:#555;margin-top:2px">OFFICIAL SALES RECEIPT</div>
    <div class="divider"></div>
  </div>

  <div style="font-size:11px;line-height:1.8;margin-bottom:10px">
    <div class="row"><span>Order #:</span><span class="bold">${orderId.slice(0,8).toUpperCase()}</span></div>
    <div class="row"><span>Date:</span><span>${new Date(date).toLocaleString('en-KE',{dateStyle:'short',timeStyle:'short'})}</span></div>
    <div class="row"><span>Cashier:</span><span>${displayName}</span></div>
    <div class="row"><span>Payment:</span><span class="bold">${paymentMethod.toUpperCase()}</span></div>
    ${transactionId ? `<div class="row muted" style="font-size:10px"><span>Txn ID:</span><span>${transactionId}</span></div>` : ''}
  </div>

  <div class="divider"></div>

  <div style="margin-bottom:10px">
    <div class="row-header"><span>ITEM</span><span>TOTAL</span></div>
    ${items.map(item => `
      <div class="item">
        <div class="bold" style="font-size:12px">${item.name}</div>
        <div class="item-meta">
          <span>${item.quantity} × KES ${fmt(item.price)}</span>
          <span>KES ${fmt(item.total)}</span>
        </div>
        ${item.discount > 0
          ? `<div class="item-disc">Saved: -KES ${fmt(item.discount * item.quantity)}</div>`
          : ''}
      </div>`).join('')}
  </div>

  <div class="divider"></div>

  <div style="font-size:11px;line-height:1.9;margin-bottom:8px">
    <div class="row"><span>Subtotal:</span><span>KES ${fmt(subtotal)}</span></div>
    ${discount > 0 ? `<div class="row green bold"><span>Discount:</span><span>-KES ${fmt(discount)}</span></div>` : ''}
    <div class="total-row"><span>TOTAL DUE:</span><span>KES ${fmt(total)}</span></div>
    ${cashRows}
  </div>

  <div class="divider"></div>
  <div class="footer">
    <div>✦ Thank you for shopping with us! ✦</div>
    <div>Please visit us again soon</div>
    <div class="bold" style="margin-top:6px;font-size:11px">PENCHIC FARM</div>
    <div>📞 +254 XXX XXX XXX</div>
  </div>

  <script>
    // Auto-print when loaded in new window (works on Android + Desktop)
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
  };

  // ── Plain-text receipt for Web Share API ─────────────────────────────────
  const buildPlainText = () => {
    const lines = [
      '===== PENCHIC FARM =====',
      `Order #: ${orderId.slice(0,8).toUpperCase()}`,
      `Date: ${new Date(date).toLocaleString('en-KE',{dateStyle:'short',timeStyle:'short'})}`,
      `Cashier: ${displayName}`,
      `Payment: ${paymentMethod.toUpperCase()}`,
      '------------------------',
      ...items.map(i =>
        `${i.name}\n  ${i.quantity} × KES ${fmt(i.price)} = KES ${fmt(i.total)}`
        + (i.discount > 0 ? `\n  Saved: -KES ${fmt(i.discount * i.quantity)}` : '')
      ),
      '------------------------',
      `Subtotal: KES ${fmt(subtotal)}`,
      ...(discount > 0 ? [`Discount: -KES ${fmt(discount)}`] : []),
      `TOTAL: KES ${fmt(total)}`,
      ...(paymentMethod === 'cash' && cashTendered !== undefined
        ? [`Cash: KES ${fmt(cashTendered)}`, `Change: KES ${fmt(change ?? 0)}`]
        : []),
      '========================',
      'Thank you for shopping!',
    ];
    return lines.join('\n');
  };

  // ── Print handler ─────────────────────────────────────────────────────────
  // Strategy:
  //  • Desktop / Android  →  window.open() + auto-print script inside the HTML
  //  • iOS                →  window.open() to new tab (auto-print blocked on iOS);
  //                          show a hint to use Safari's share → Print
  //  • Popup blocked      →  silent fallback to hidden iframe
  const handlePrint = () => {
    setStatus('printing');
    const html = buildHtml();

    // Must open window synchronously (inside click handler) to avoid popup blocker
    const win = window.open('', '_blank', 'width=420,height=680,scrollbars=yes,resizable=yes');

    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();

      if (isIOS()) {
        // iOS ignores window.print() — show tap-to-print hint
        setTimeout(() => {
          setStatus('ios-hint');
          onPrintComplete?.();
        }, 400);
      } else {
        // Auto-print script inside HTML handles the print call.
        // We just clean up state after a generous delay.
        setTimeout(() => {
          setStatus('done');
          onPrintComplete?.();
        }, 1200);
      }
    } else {
      // Popup blocked — fall back to hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) { setStatus('idle'); return; }
      doc.open(); doc.write(html); doc.close();
      iframe.onload = () => {
        try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
        catch (e) { console.error('iframe print failed:', e); }
        finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
            setStatus('done');
            onPrintComplete?.();
          }, 600);
        }
      };
    }
  };

  // ── Web Share API (mobile) ────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Receipt #${orderId.slice(0,8).toUpperCase()} – Penchic Farm`,
        text: buildPlainText(),
      });
    } catch (e) {
      // User cancelled or share failed — no-op
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Receipt preview ─────────────────────────────────────────────── */}
      <div className="bg-neutral-900 rounded-xl overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 ml-1">
              receipt-{orderId.slice(0,8).toUpperCase()}.txt
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-600">
            {new Date(date).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>

        {/* Scrollable receipt body */}
        <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs text-neutral-100 space-y-0 scrollbar-thin">
          {/* Store header */}
          <div className="text-center mb-3">
            <p className="font-bold text-sm tracking-[3px] text-white">PENCHIC FARM</p>
            <p className="text-neutral-500 text-[10px] mt-0.5 tracking-wider">SALES RECEIPT</p>
          </div>

          {/* Meta */}
          <div className="border-t border-neutral-700 pt-2 pb-2 space-y-0.5 text-[11px]">
            {[
              ['Order #', orderId.slice(0,8).toUpperCase()],
              ['Date', new Date(date).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })],
              ['Cashier', displayName],
              ['Payment', paymentMethod.toUpperCase()],
              ...(transactionId ? [['Txn', transactionId.slice(0, 20)]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-neutral-500 flex-shrink-0">{k}:</span>
                <span className="text-right text-neutral-200 truncate max-w-[160px]">{v}</span>
              </div>
            ))}
          </div>

          {/* Items */}
          <div className="border-t border-neutral-700 pt-2 pb-2 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-neutral-400 border-b border-neutral-800 pb-1 mb-1">
              <span>ITEM</span><span>TOTAL</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx}>
                <p className="font-semibold text-white text-[11px] leading-snug">{item.name}</p>
                <div className="flex justify-between text-neutral-500 text-[10px]">
                  <span>{item.quantity} × KES {fmt(item.price)}</span>
                  <span className="text-neutral-300">KES {fmt(item.total)}</span>
                </div>
                {item.discount > 0 && (
                  <p className="text-emerald-400 text-[10px]">
                    Saved: -KES {fmt(item.discount * item.quantity)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-neutral-700 pt-2 space-y-0.5 text-[11px]">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal:</span><span>KES {fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Discount:</span><span>-KES {fmt(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white text-sm border-t border-neutral-600 pt-1.5 mt-1">
              <span>TOTAL DUE:</span><span>KES {fmt(total)}</span>
            </div>
            {paymentMethod === 'cash' && cashTendered !== undefined && (
              <div className="border-t border-dashed border-neutral-700 pt-1.5 mt-1 space-y-0.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Cash:</span><span>KES {fmt(cashTendered)}</span>
                </div>
                <div className={`flex justify-between font-semibold ${(change ?? 0) > 0 ? 'text-amber-400' : 'text-neutral-500'}`}>
                  <span>Change:</span><span>KES {fmt(change ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-center pt-2 mt-1 border-t border-neutral-800 text-neutral-600 text-[10px]">
            Thank you for shopping with us!
          </div>
        </div>
      </div>

      {/* ── iOS print hint ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {status === 'ios-hint' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3"
          >
            <ExternalLink className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Receipt opened in new tab</p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                Tap the <strong>Share</strong> button in Safari, then choose <strong>Print</strong>.
              </p>
            </div>
          </motion.div>
        )}

        {status === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-emerald-800">Print dialog opened successfully</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex gap-2.5">
        {/* Print */}
        <button
          onClick={handlePrint}
          disabled={status === 'printing'}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900
            hover:bg-neutral-800 active:bg-neutral-700 text-white rounded-xl transition-colors
            disabled:opacity-50 font-semibold touch-manipulation text-sm"
        >
          <Printer className="w-4 h-4 flex-shrink-0" />
          <span>{status === 'printing' ? 'Opening…' : 'Print Receipt'}</span>
        </button>

        {/* Share — only on capable devices */}
        {isMobile() && canShare() && (
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100
              hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700 rounded-xl
              transition-colors font-semibold touch-manipulation text-sm flex-shrink-0"
            title="Share receipt"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {/* Close */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100
              hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700 rounded-xl
              transition-colors font-semibold touch-manipulation text-sm flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPrinter;

import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';

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

const ReceiptPrinter: React.FC<ReceiptProps> = ({
  orderId, items, subtotal, discount, total,
  paymentMethod, transactionId, cashierEmail, cashierName,
  date, cashTendered, change, onPrintComplete, onClose,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const displayName = cashierName
    || cashierEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handlePrint = () => {
    setIsPrinting(true);

    const cashRows = paymentMethod === 'cash' && cashTendered !== undefined
      ? `
        <div class="divider-thin"></div>
        <div class="row"><span>Cash Tendered:</span><span>KES ${cashTendered.toLocaleString('en-KE')}</span></div>
        ${(change ?? 0) > 0
          ? `<div class="row bold"><span>Change:</span><span>KES ${(change ?? 0).toLocaleString('en-KE')}</span></div>`
          : `<div class="row" style="color:#555"><span>Change:</span><span>KES 0.00</span></div>`
        }
      `
      : '';

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt-${orderId.slice(0, 8)}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Courier New',Courier,monospace; font-size:12px; color:#000; background:#fff; padding:16px; width:300px; }
            .center { text-align:center; }
            .bold { font-weight:bold; }
            .divider { border-top:2px solid #000; margin:10px 0; }
            .divider-thin { border-top:1px dashed #000; margin:6px 0; }
            .row { display:flex; justify-content:space-between; margin-bottom:3px; }
            .row-header { display:flex; justify-content:space-between; font-weight:bold; border-bottom:1px solid #000; padding-bottom:4px; margin-bottom:6px; }
            .item { margin-bottom:6px; }
            .item-detail { font-size:10px; color:#444; text-align:right; }
            .item-discount { font-size:10px; color:#228b22; }
            .total-row { display:flex; justify-content:space-between; font-weight:bold; font-size:14px; border-top:1px solid #000; padding-top:6px; margin-top:4px; }
            .savings { color:#228b22; font-weight:bold; }
            .footer { text-align:center; margin-top:14px; font-size:10px; line-height:1.8; }
            @media print { body { width:100%; padding:0; } }
          </style>
        </head>
        <body>
          <div class="center" style="margin-bottom:16px;">
            <div class="bold" style="font-size:16px;letter-spacing:1px;">PENCHIC FARM</div>
            <div style="font-size:11px;margin-top:2px;">Sales Receipt</div>
            <div class="divider"></div>
          </div>

          <div style="margin-bottom:12px;line-height:1.7;font-size:11px;">
            <div class="row"><span>Order #:</span><span>${orderId.slice(0,8).toUpperCase()}</span></div>
            <div class="row"><span>Date:</span><span>${new Date(date).toLocaleString('en-KE',{dateStyle:'short',timeStyle:'short'})}</span></div>
            <div class="row"><span>Cashier:</span><span>${displayName}</span></div>
            <div class="row"><span>Payment:</span><span>${paymentMethod.toUpperCase()}</span></div>
            ${transactionId ? `<div class="row" style="font-size:10px;color:#555;"><span>Txn ID:</span><span>${transactionId}</span></div>` : ''}
          </div>

          <div class="divider"></div>

          <div style="margin-bottom:12px;">
            <div class="row-header"><span>Item</span><span>Total</span></div>
            ${items.map(item => `
              <div class="item">
                <div style="font-weight:bold;">${item.name}</div>
                <div class="item-detail">${item.quantity} × KES ${item.price.toLocaleString('en-KE')} = KES ${item.total.toLocaleString('en-KE')}</div>
                ${item.discount > 0 ? `<div class="item-discount">Discount: -KES ${(item.discount * item.quantity).toLocaleString('en-KE')}</div>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="divider"></div>

          <div style="font-size:11px;line-height:1.8;margin-bottom:8px;">
            <div class="row"><span>Subtotal:</span><span>KES ${subtotal.toLocaleString('en-KE')}</span></div>
            ${discount > 0 ? `<div class="row savings"><span>Discount:</span><span>-KES ${discount.toLocaleString('en-KE')}</span></div>` : ''}
            <div class="total-row"><span>TOTAL:</span><span>KES ${total.toLocaleString('en-KE')}</span></div>
            ${cashRows}
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div>Thank you for shopping with us!</div>
            <div>Visit us again soon</div>
            <div class="bold" style="margin-top:8px;">PENCHIC FARM</div>
            <div>Contact: +254 XXX XXX XXX</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { setIsPrinting(false); document.body.removeChild(iframe); return; }
    iframeDoc.open(); iframeDoc.write(receiptHtml); iframeDoc.close();
    iframe.onload = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
      catch (e) { console.error('Print failed:', e); }
      finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
          setIsPrinting(false);
          onPrintComplete?.();
        }, 500);
      }
    };
  };

  return (
    <div className="space-y-4">
      {/* Terminal-style receipt preview */}
      <div className="bg-neutral-900 text-neutral-100 p-4 rounded-xl text-xs font-mono max-h-72 overflow-y-auto">
        <div className="text-center mb-3">
          <p className="font-bold text-sm tracking-widest">PENCHIC FARM</p>
          <p className="text-neutral-500 text-[10px] mt-0.5">SALES RECEIPT</p>
        </div>

        <div className="border-t border-neutral-700 py-2 space-y-1 text-[11px]">
          {[
            ['Order #', orderId.slice(0,8).toUpperCase()],
            ['Date',    new Date(date).toLocaleString('en-KE',{dateStyle:'short',timeStyle:'short'})],
            ['Cashier', displayName],
            ['Payment', paymentMethod.toUpperCase()],
            ...(transactionId ? [['Txn', transactionId]] : []),
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-neutral-500 flex-shrink-0">{k}:</span>
              <span className="truncate text-right">{v}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-700 py-2 space-y-2">
          {items.map((item, idx) => (
            <div key={idx}>
              <div className="font-semibold">{item.name}</div>
              <div className="flex justify-between text-neutral-500 text-[10px]">
                <span>{item.quantity} × KES {item.price.toLocaleString()}</span>
                <span>KES {item.total.toLocaleString()}</span>
              </div>
              {item.discount > 0 && (
                <div className="text-emerald-400 text-[10px]">
                  Discount: -KES {(item.discount * item.quantity).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-700 py-2 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-neutral-500">Subtotal:</span>
            <span>KES {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount:</span><span>-KES {discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-neutral-700 pt-1.5 mt-1 text-sm">
            <span>TOTAL:</span><span>KES {total.toLocaleString()}</span>
          </div>
          {paymentMethod === 'cash' && cashTendered !== undefined && (
            <>
              <div className="border-t border-dashed border-neutral-700 pt-1.5 mt-1 space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-500">Cash Tendered:</span>
                  <span>KES {cashTendered.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between font-bold ${(change ?? 0) > 0 ? 'text-amber-400' : 'text-neutral-500'}`}>
                  <span>Change:</span>
                  <span>KES {(change ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-3 pt-2 border-t border-neutral-700 text-neutral-500 text-[10px]">
          Thank you for shopping with us!
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 hover:bg-neutral-800
            text-white rounded-xl transition-colors disabled:opacity-50 font-semibold touch-manipulation text-sm"
        >
          <Printer className="w-4 h-4" />
          {isPrinting ? 'Opening Print…' : 'Print Receipt'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100
              hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors font-semibold touch-manipulation text-sm"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPrinter;

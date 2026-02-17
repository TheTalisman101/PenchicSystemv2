import React, { useRef, useState } from 'react';
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
  onPrintComplete?: () => void;
  onClose?: () => void;
}

const ReceiptPrinter: React.FC<ReceiptProps> = ({
  orderId,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  transactionId,
  cashierEmail,
  cashierName,
  date,
  onPrintComplete,
  onClose
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  // Derive a display name from email if no explicit name provided
  // e.g. "john.doe@gmail.com" → "John Doe"
  const displayName = cashierName
    || cashierEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

  const handlePrint = () => {
    setIsPrinting(true);

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt-${orderId.slice(0, 8)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              background: #fff;
              padding: 16px;
              width: 300px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 2px solid #000; margin: 10px 0; }
            .divider-thin { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .row-header { display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
            .item { margin-bottom: 6px; }
            .item-detail { font-size: 10px; color: #444; text-align: right; }
            .item-discount { font-size: 10px; color: #228b22; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 6px; margin-top: 4px; }
            .savings { color: #228b22; font-weight: bold; }
            .footer { text-align: center; margin-top: 14px; font-size: 10px; line-height: 1.8; }
            @media print {
              body { width: 100%; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="center" style="margin-bottom: 16px;">
            <div class="bold" style="font-size: 16px; letter-spacing: 1px;">PENCHIC FARM</div>
            <div style="font-size: 11px; margin-top: 2px;">Sales Receipt</div>
            <div class="divider"></div>
          </div>

          <div style="margin-bottom: 12px; line-height: 1.7; font-size: 11px;">
            <div class="row"><span>Order #:</span><span>${orderId.slice(0, 8).toUpperCase()}</span></div>
            <div class="row"><span>Date:</span><span>${new Date(date).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
            <div class="row"><span>Cashier:</span><span>${displayName}</span></div>
            <div class="row"><span>Payment:</span><span>${paymentMethod.toUpperCase()}</span></div>
            ${transactionId ? `<div class="row" style="font-size:10px;color:#555;"><span>Txn ID:</span><span>${transactionId}</span></div>` : ''}
          </div>

          <div class="divider"></div>

          <div style="margin-bottom: 12px;">
            <div class="row-header">
              <span>Item</span>
              <span>Total</span>
            </div>
            ${items.map(item => `
              <div class="item">
                <div style="font-weight: bold;">${item.name}</div>
                <div class="item-detail">${item.quantity} × KES ${item.price.toLocaleString('en-KE')} = KES ${item.total.toLocaleString('en-KE')}</div>
                ${item.discount > 0 ? `<div class="item-discount">Discount: -KES ${(item.discount * item.quantity).toLocaleString('en-KE')}</div>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="divider"></div>

          <div style="font-size: 11px; line-height: 1.8; margin-bottom: 8px;">
            <div class="row"><span>Subtotal:</span><span>KES ${subtotal.toLocaleString('en-KE')}</span></div>
            ${discount > 0 ? `<div class="row savings"><span>Discount:</span><span>-KES ${discount.toLocaleString('en-KE')}</span></div>` : ''}
            <div class="total-row"><span>TOTAL:</span><span>KES ${total.toLocaleString('en-KE')}</span></div>
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div>Thank you for shopping with us!</div>
            <div>Visit us again soon</div>
            <div class="bold" style="margin-top: 8px;">PENCHIC FARM</div>
            <div>Contact: +254 XXX XXX XXX</div>
          </div>
        </body>
      </html>
    `;

    // Create a hidden iframe, write the receipt HTML into it, then print it
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      setIsPrinting(false);
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(receiptHtml);
    iframeDoc.close();

    // Wait for content to render, then print
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print failed:', e);
      } finally {
        // Clean up iframe after print dialog closes
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
      {/* Receipt Preview */}
      <div className="bg-neutral-900 text-neutral-100 p-4 rounded-lg text-xs font-mono max-h-64 overflow-y-auto">
        <div className="text-center mb-3">
          <p className="font-bold text-sm tracking-wider">PENCHIC FARM</p>
          <p className="text-neutral-400">SALES RECEIPT</p>
        </div>

        <div className="border-t border-neutral-700 py-2">
          <div className="flex justify-between mb-1">
            <span className="text-neutral-400">Order #:</span>
            <span>{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-neutral-400">Date:</span>
            <span>{new Date(date).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-neutral-400">Cashier:</span>
            <span className="truncate ml-2">{displayName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Payment:</span>
            <span>{paymentMethod.toUpperCase()}</span>
          </div>
          {transactionId && (
            <div className="flex justify-between mt-1">
              <span className="text-neutral-400">Txn:</span>
              <span className="truncate ml-2">{transactionId}</span>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-700 py-2">
          {items.map((item, idx) => (
            <div key={idx} className="mb-2">
              <div className="font-medium">{item.name}</div>
              <div className="flex justify-between text-neutral-400">
                <span>{item.quantity} × KES {item.price.toLocaleString()}</span>
                <span>KES {item.total.toLocaleString()}</span>
              </div>
              {item.discount > 0 && (
                <div className="text-green-400 text-xs">
                  Discount: -KES {(item.discount * item.quantity).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-700 py-2">
          <div className="flex justify-between mb-1">
            <span className="text-neutral-400">Subtotal:</span>
            <span>KES {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between mb-1 text-green-400">
              <span>Discount:</span>
              <span>-KES {discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-neutral-700 pt-1 mt-1">
            <span>TOTAL:</span>
            <span>KES {total.toLocaleString()}</span>
          </div>
        </div>

        <div className="text-center mt-3 pt-2 border-t border-neutral-700 text-neutral-400">
          <p>Thank you for shopping with us!</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold touch-manipulation"
        >
          <Printer className="w-5 h-5" />
          {isPrinting ? 'Opening Print...' : 'Print Receipt'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-300 transition-colors font-semibold touch-manipulation"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPrinter;
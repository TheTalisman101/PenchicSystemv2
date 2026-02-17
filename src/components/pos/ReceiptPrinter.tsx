import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
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
  date,
  onPrintComplete,
  onClose
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${orderId.slice(0, 8)}`,
    onAfterPrint: () => {
      setIsPrinting(false);
      onPrintComplete?.();
    },
    onBeforePrint: () => setIsPrinting(true),
  });

  return (
    <div className="space-y-4">
      {/* Receipt Preview for Mobile */}
      <div className="lg:hidden bg-neutral-900 text-neutral-100 p-4 rounded-lg text-xs font-mono max-h-64 overflow-y-auto">
        <div className="text-center mb-4">
          <p className="font-bold text-sm">PENCHIC FARM</p>
          <p>SALES RECEIPT</p>
        </div>

        <div className="border-t border-neutral-700 py-2 text-xs">
          <div className="flex justify-between mb-1">
            <span>Order #:</span>
            <span>{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Date:</span>
            <span>{date.toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Cashier:</span>
            <span className="truncate">{cashierEmail}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span>{paymentMethod.toUpperCase()}</span>
          </div>
          {transactionId && (
            <div className="flex justify-between mt-1">
              <span>Txn:</span>
              <span className="truncate">{transactionId}</span>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-700 py-2 text-xs">
          {items.map((item, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between">
                <span className="truncate">{item.name}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{item.quantity} × {item.price.toLocaleString()}</span>
                <span>{item.total.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-700 py-2 text-xs">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>{subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between mb-1 text-green-400">
              <span>Discount:</span>
              <span>-{discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-neutral-700 pt-1 mt-1 text-sm">
            <span>TOTAL:</span>
            <span>{total.toLocaleString()}</span>
          </div>
        </div>

        <div className="text-center mt-3 pt-3 border-t border-neutral-700 text-xs">
          <p>Thank you!</p>
        </div>
      </div>

      {/* Hidden Print Version */}
      <div style={{ display: 'none' }} ref={receiptRef}>
        <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '300px', backgroundColor: 'white', color: 'black' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>PENCHIC FARM</h1>
            <p style={{ fontSize: '12px', margin: '0' }}>Sales Receipt</p>
            <div style={{ borderTop: '2px solid #000', margin: '10px 0' }}></div>
          </div>

          <div style={{ fontSize: '11px', marginBottom: '15px', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Order #:</span>
              <span>{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Date:</span>
              <span>{date.toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Cashier:</span>
              <span>{cashierEmail}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment:</span>
              <span>{paymentMethod.toUpperCase()}</span>
            </div>
            {transactionId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', color: '#666' }}>
                <span>Transaction ID:</span>
                <span>{transactionId}</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '2px solid #000', margin: '10px 0' }}></div>

          <div style={{ marginBottom: '15px', fontSize: '10px', lineHeight: '1.8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Total</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx}>
                <div style={{ marginBottom: '5px' }}>
                  <div>{item.name}</div>
                  <div style={{ fontSize: '9px', color: '#666', textAlign: 'right' }}>
                    {item.quantity} × KES {item.price.toLocaleString('en-KE')} = KES {item.total.toLocaleString('en-KE')}
                  </div>
                  {item.discount > 0 && (
                    <div style={{ fontSize: '9px', color: '#28a745' }}>
                      Discount: -KES {(item.discount * item.quantity).toLocaleString('en-KE')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #000', margin: '10px 0' }}></div>

          <div style={{ fontSize: '11px', marginBottom: '10px', lineHeight: '1.8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <span>KES {subtotal.toLocaleString('en-KE')}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#28a745', fontWeight: 'bold' }}>
                <span>Discount:</span>
                <span>-KES {discount.toLocaleString('en-KE')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #000' }}>
              <span>TOTAL:</span>
              <span>KES {total.toLocaleString('en-KE')}</span>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #000', margin: '15px 0' }}></div>

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '15px', lineHeight: '1.6' }}>
            <p style={{ margin: '5px 0' }}>Thank you for shopping with us!</p>
            <p style={{ margin: '5px 0' }}>Visit us again soon</p>
            <p style={{ margin: '10px 0 5px 0', fontWeight: 'bold' }}>PENCHIC FARM</p>
            <p style={{ margin: '0' }}>Contact: +254 XXX XXX XXX</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          <Printer className="w-5 h-5" />
          {isPrinting ? 'Printing...' : 'Print Receipt'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-300 transition-colors font-semibold"
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

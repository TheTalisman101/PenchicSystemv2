import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download } from 'lucide-react';

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
  cashierEmail: string;
  date: Date;
  onPrintComplete?: () => void;
}

const ReceiptPrinter: React.FC<ReceiptProps> = ({
  orderId,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  cashierEmail,
  date,
  onPrintComplete
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${orderId}`,
    onAfterPrint: onPrintComplete,
  });

  return (
    <div>
      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
      >
        <Printer className="w-5 h-5" />
        Print Receipt
      </button>

      <div style={{ display: 'none' }}>
        <div ref={receiptRef} style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '400px', backgroundColor: '#fff' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '3px solid #2563eb', paddingBottom: '15px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e40af', letterSpacing: '1px' }}>PENCHIC FARM</h1>
            <p style={{ fontSize: '11px', margin: '3px 0', color: '#64748b' }}>Premium Poultry & Farm Products</p>
            <p style={{ fontSize: '11px', margin: '3px 0', color: '#64748b' }}>P.O. Box 12345, Nairobi, Kenya</p>
            <p style={{ fontSize: '11px', margin: '3px 0', color: '#64748b' }}>Tel: +254 712 345 678 | Email: info@penchicfarm.co.ke</p>
            <p style={{ fontSize: '11px', margin: '8px 0 0 0', fontWeight: 'bold', color: '#1e40af' }}>PIN: P051234567X</p>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SALES RECEIPT</h2>
          </div>

          <div style={{ fontSize: '12px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#475569' }}>Receipt No:</span>
              <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#475569' }}>Date & Time:</span>
              <span style={{ color: '#1e293b' }}>{date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#475569' }}>Served By:</span>
              <span style={{ color: '#1e293b' }}>{cashierEmail.split('@')[0]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600', color: '#475569' }}>Payment Method:</span>
              <span style={{ fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase' }}>{paymentMethod}</span>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #e2e8f0', margin: '15px 0' }}></div>

          <div style={{ marginBottom: '20px' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: '700', color: '#334155' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '700', color: '#334155' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: '700', color: '#334155' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: '700', color: '#334155' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top', color: '#1e293b' }}>{item.name}</td>
                      <td style={{ textAlign: 'center', padding: '12px 8px', verticalAlign: 'top', fontWeight: '600', color: '#475569' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '12px 8px', verticalAlign: 'top', color: '#475569' }}>
                        {item.discount > 0 ? (
                          <div>
                            <div style={{ textDecoration: 'line-through', fontSize: '10px', color: '#94a3b8' }}>
                              {item.price.toLocaleString()}
                            </div>
                            <div style={{ fontWeight: '600', color: '#059669' }}>{(item.price - item.discount).toLocaleString()}</div>
                          </div>
                        ) : (
                          <span style={{ fontWeight: '600' }}>{item.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 8px', verticalAlign: 'top', fontWeight: '700', color: '#1e293b' }}>
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                    {item.discount > 0 && (
                      <tr>
                        <td colSpan={4} style={{ fontSize: '10px', color: '#059669', paddingBottom: '8px', paddingLeft: '8px', fontWeight: '600' }}>
                          Discount Applied: -KES {(item.discount * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '2px solid #e2e8f0', margin: '15px 0' }}></div>

          <div style={{ fontSize: '13px', marginBottom: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#475569', fontWeight: '600' }}>Subtotal:</span>
              <span style={{ fontWeight: '700', color: '#1e293b' }}>KES {subtotal.toLocaleString('en-KE')}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#059669', fontWeight: '600' }}>Total Discount:</span>
                <span style={{ fontWeight: '700', color: '#059669' }}>-KES {discount.toLocaleString('en-KE')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #2563eb', color: '#1e40af' }}>
              <span>AMOUNT PAID:</span>
              <span>KES {total.toLocaleString('en-KE')}</span>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #e2e8f0', margin: '20px 0' }}></div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#1e40af' }}>Thank You For Your Purchase!</p>
              <p style={{ margin: '0', fontSize: '11px', color: '#475569' }}>We appreciate your business and look forward to serving you again.</p>
            </div>

            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
              <p style={{ margin: '5px 0', fontWeight: '600', color: '#475569' }}>PENCHIC FARM</p>
              <p style={{ margin: '3px 0' }}>Quality Poultry Products Since 2020</p>
              <p style={{ margin: '8px 0 3px 0', fontWeight: '600', color: '#475569' }}>Customer Support:</p>
              <p style={{ margin: '3px 0' }}>Phone: +254 712 345 678</p>
              <p style={{ margin: '3px 0' }}>WhatsApp: +254 723 456 789</p>
              <p style={{ margin: '3px 0' }}>Email: support@penchicfarm.co.ke</p>
              <p style={{ margin: '10px 0 3px 0', fontStyle: 'italic' }}>Operating Hours: Mon-Sat 7:00 AM - 7:00 PM</p>
            </div>

            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0', fontSize: '10px', color: '#94a3b8' }}>This is a computer-generated receipt</p>
              <p style={{ margin: '3px 0', fontSize: '10px', color: '#94a3b8' }}>Goods once sold cannot be returned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrinter;

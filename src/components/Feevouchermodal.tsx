import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer } from 'lucide-react';
import { FeeInvoice } from '../Hooks/Usefees';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'PKR') {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FeeVoucherModalProps {
  invoice: FeeInvoice | null;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const FeeVoucherModal: React.FC<FeeVoucherModalProps> = ({ invoice, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Voucher – ${invoice?.name}</title>
          <meta charset="utf-8"/>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; }
            .voucher-card { max-width: 680px; margin: 24px auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
            .header-bar { height: 8px; background: #22c55e; }
            .header-body { background: #1a7a4a; display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; }
            .school-name { color: #fff; font-size: 22px; font-weight: 600; }
            .school-sub { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 2px; }
            .logo-circle { width: 52px; height: 52px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: #fff; }
            .invoice-badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #fff; font-size: 12px; padding: 5px 14px; border-radius: 20px; margin-top: 10px; display: inline-block; }
            .body { padding: 20px 24px; }
            .meta-row { display: flex; gap: 12px; margin-bottom: 16px; }
            .meta-card { flex: 1; background: #f9fafb; border-radius: 8px; padding: 10px 14px; }
            .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
            .meta-value { font-size: 13px; font-weight: 500; }
            .status-badge { display: inline-flex; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
            .status-Paid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
            .status-Unpaid { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
            .status-Overdue { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
            .status-Partially\\ Paid { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
            .bill-row { display: flex; gap: 16px; margin-bottom: 16px; }
            .bill-block { flex: 1; }
            .bill-title { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
            .bill-name { font-size: 15px; font-weight: 500; }
            .bill-detail { font-size: 12px; color: #6b7280; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
            th { font-size: 11px; font-weight: 500; color: #6b7280; text-align: left; padding: 6px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
            th:last-child { text-align: right; }
            td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
            td:last-child { text-align: right; font-weight: 500; }
            .total-row td { font-weight: 600; font-size: 14px; background: #f9fafb; }
            .total-row td:last-child { color: #1a7a4a; font-size: 16px; }
            .divider { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
            .section-title { font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
            .uid-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
            .uid-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
            .uid-value { font-size: 15px; font-weight: 500; letter-spacing: 1px; }
            .p-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
            .p-label { color: #6b7280; }
            .p-value { font-weight: 500; }
            .footer-note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #166534; line-height: 1.5; margin-top: 12px; }
            .portal-link { color: #1a7a4a; font-weight: 500; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (!invoice) return null;

  const paidAmount = invoice.grand_total - invoice.outstanding_amount;

  return (
    <AnimatePresence>
      {invoice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Fee Voucher</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Voucher */}
            <div ref={printRef}>
              <div className="voucher-card" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

                {/* Header */}
                <div style={{ background: '#1a7a4a' }}>
                  <div style={{ height: 8, background: '#22c55e' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: 22, fontWeight: 600 }}>Learn Academy</div>
                      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>Finance.learnschool@gmail.com</div>
                      <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#fff', fontSize: 12,
                        padding: '5px 14px', borderRadius: 20,
                        marginTop: 10, display: 'inline-block',
                      }}>
                        Invoice ID: 100333 0191 2527 6000 01
                      </div>
                    </div>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 600, color: '#fff',
                    }}>LA</div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px' }}>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const }}>
                    {[
                      { label: 'Bill No', value: invoice.name },
                      { label: 'Issue Date', value: formatDate(invoice.posting_date) },
                      { label: 'Due Date', value: formatDate(invoice.due_date) },
                    ].map((m) => (
                      <div key={m.label} style={{ flex: 1, minWidth: 110, background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.value}</div>
                      </div>
                    ))}
                    <div style={{ flex: 1, minWidth: 110, background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Status</div>
                      <span className={`status-${invoice.status}`} style={{
                        display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: invoice.status === 'Paid' ? '#dcfce7' : invoice.status === 'Overdue' ? '#fee2e2' : '#fef9c3',
                        color: invoice.status === 'Paid' ? '#166534' : invoice.status === 'Overdue' ? '#991b1b' : '#854d0e',
                        border: `1px solid ${invoice.status === 'Paid' ? '#86efac' : invoice.status === 'Overdue' ? '#fca5a5' : '#fde047'}`,
                      }}>{invoice.status}</span>
                    </div>
                  </div>

                  {/* Bill To / Ship To */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Bill To</div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{invoice.customer_name}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Ship To</div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>Learn Academy</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Finance.learnschool@gmail.com</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Sr', 'Description', 'Rate', 'Amount'].map((h, i) => (
                          <th key={h} style={{
                            fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: i === 3 ? 'right' : 'left',
                            padding: '6px 10px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice.items.length > 0 ? invoice.items : [{ item_name: invoice.title, amount: invoice.grand_total, rate: invoice.grand_total, qty: 1, item_code: '', description: '' }]).map((item, i) => (
                        <tr key={i}>
                          <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{i + 1}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{item.item_name}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(item.rate, invoice.currency)}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.amount, invoice.currency)}</td>
                        </tr>
                      ))}
                      {paidAmount > 0 && paidAmount < invoice.grand_total && (
                        <tr>
                          <td colSpan={3} style={{ padding: '10px', textAlign: 'right', color: '#6b7280', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}>Amount Paid</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: 500, borderBottom: '1px solid #f3f4f6' }}>- {formatCurrency(paidAmount, invoice.currency)}</td>
                        </tr>
                      )}
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan={3} style={{ padding: '10px', textAlign: 'right', fontWeight: 600, fontSize: 14 }}>Grand Total</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, fontSize: 16, color: '#1a7a4a' }}>{formatCurrency(invoice.grand_total, invoice.currency)}</td>
                      </tr>
                      {invoice.outstanding_amount > 0 && invoice.outstanding_amount !== invoice.grand_total && (
                        <tr style={{ background: '#fff7ed' }}>
                          <td colSpan={3} style={{ padding: '10px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: '#c2410c' }}>Outstanding Balance</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#c2410c' }}>{formatCurrency(invoice.outstanding_amount, invoice.currency)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />

                  {/* Payment Instructions */}
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Payment Instructions</div>

                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Child Unique ID to Pay</div>
                    <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: 1, borderBottom: '1.5px solid #9ca3af', paddingBottom: 4, minWidth: 200 }}>&nbsp;</div>
                  </div>

                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
                    Visit payment portal:{' '}
                    <a href="https://learnschoolacademy.com/fee-payment/" style={{ color: '#1a7a4a', fontWeight: 500 }}>
                      learnschoolacademy.com/fee-payment/
                    </a>
                    {' '}— Please attach proof of payment and send to provided Email or WhatsApp.
                  </div>

                  {/* Bank Details */}
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Bank Details</div>
                  {[
                    ['Account Title', 'Wahaj Latif Kayani'],
                    ['Account Number', '272324501'],
                    ['Bank', 'United Bank Limited'],
                    ['Branch', '2D Sunset Boulevard, DHA Phase VI, Karachi'],
                    ['IBAN', 'PK38UNIL0109000272324501'],
                    ['Swift Code', 'PKKAUNIL'],
                    ['Exchange Rate', '1 AED = PKR (as per date)'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>{label}</span>
                      <span style={{ fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', lineHeight: 1.5, marginTop: 16 }}>
                    Dear Parent — Once payment is completed, please attach the proof of payment and send it to the provided Email or WhatsApp number.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
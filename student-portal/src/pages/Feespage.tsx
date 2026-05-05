import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Banknote,
  TrendingUp,
  FileText,
  Calendar,
  CreditCard,
  FileSearch,
} from 'lucide-react';
import { useFees, FeeInvoice } from '../Hooks/Usefees';
import { useUser } from '../context/UserContext';
import { cn } from '../lib/utils';
import { FeeVoucherModal } from '../components/Feevouchermodal';

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

function isOverdue(dueDateStr: string) {
  if (!dueDateStr) return false;
  return new Date(dueDateStr) < new Date();
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: FeeInvoice['status'] }> = ({ status }) => {
  const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    Paid: {
      label: 'Paid',
      className: 'bg-green-50 text-green-700 border border-green-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    Unpaid: {
      label: 'Unpaid',
      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    Overdue: {
      label: 'Overdue',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    'Partially Paid': {
      label: 'Partial',
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: <CreditCard className="w-3.5 h-3.5" />,
    },
  };
  const cfg = configs[status] || configs['Unpaid'];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ── Invoice Card ─────────────────────────────────────────────────────────────

const InvoiceCard: React.FC<{
  invoice: FeeInvoice;
  index: number;
  onViewVoucher: (invoice: FeeInvoice) => void;
}> = ({ invoice, index, onViewVoucher }) => {
  const [expanded, setExpanded] = useState(false);
  const paidAmount = invoice.grand_total - invoice.outstanding_amount;
  const paymentPct = invoice.grand_total > 0 ? (paidAmount / invoice.grand_total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            invoice.status === 'Paid' ? 'bg-green-50' :
            invoice.status === 'Overdue' ? 'bg-red-50' : 'bg-yellow-50'
          )}>
            <Receipt className={cn(
              'w-5 h-5',
              invoice.status === 'Paid' ? 'text-green-600' :
              invoice.status === 'Overdue' ? 'text-red-600' : 'text-yellow-600'
            )} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 text-sm">{invoice.name}</p>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Issued: {formatDate(invoice.posting_date)}
              </span>
              <span className={cn(
                'flex items-center gap-1',
                invoice.status === 'Overdue' && 'text-red-500 font-medium'
              )}>
                <Clock className="w-3 h-3" />
                Due: {formatDate(invoice.due_date)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="font-bold text-gray-900 text-base">
              {formatCurrency(invoice.grand_total, invoice.currency)}
            </p>
            {invoice.outstanding_amount > 0 && (
              <p className="text-xs text-red-500 font-medium">
                {formatCurrency(invoice.outstanding_amount)} due
              </p>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Payment Progress Bar */}
      {invoice.grand_total > 0 && (
        <div className="px-5 pb-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${paymentPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                paymentPct >= 100 ? 'bg-green-500' :
                paymentPct > 0 ? 'bg-blue-500' : 'bg-red-300'
              )}
            />
          </div>
        </div>
      )}

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-3 space-y-4 border-t border-gray-50">

              {/* Fee Items */}
              {invoice.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fee Breakdown</h4>
                  <div className="space-y-2">
                    {invoice.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                          {item.description && item.description !== item.item_name && (
                            <p className="text-xs text-gray-400">{item.description}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(item.amount, invoice.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Schedule */}
              {invoice.payment_schedule.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Schedule</h4>
                  <div className="space-y-2">
                    {invoice.payment_schedule.map((ps, i) => (
                      <div key={i} className={cn(
                        'flex justify-between items-center p-3 rounded-xl text-sm',
                        ps.outstanding > 0 && isOverdue(ps.due_date)
                          ? 'bg-red-50 border border-red-100'
                          : ps.outstanding <= 0
                          ? 'bg-green-50 border border-green-100'
                          : 'bg-gray-50'
                      )}>
                        <div>
                          <p className="font-medium text-gray-800">Due: {formatDate(ps.due_date)}</p>
                          <p className="text-xs text-gray-500">{ps.invoice_portion}% of invoice</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(ps.payment_amount, invoice.currency)}</p>
                          {ps.outstanding > 0 ? (
                            <p className="text-xs text-red-500">{formatCurrency(ps.outstanding)} outstanding</p>
                          ) : (
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3" /> Cleared
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Row */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Total: <strong className="text-gray-700">{formatCurrency(invoice.grand_total, invoice.currency)}</strong></span>
                  <span>Paid: <strong className="text-green-600">{formatCurrency(paidAmount, invoice.currency)}</strong></span>
                </div>
                {invoice.outstanding_amount > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                    Balance: {formatCurrency(invoice.outstanding_amount, invoice.currency)}
                  </span>
                )}
              </div>

              {/* View Fee Voucher Button */}
              <button
                onClick={() => onViewVoucher(invoice)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-colors"
              >
                <FileSearch className="w-4 h-4" />
                View Fee Voucher
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Summary Cards ─────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay: number;
}> = ({ icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
  >
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
      {icon}
    </div>
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
    <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </motion.div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterType = 'All' | 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';

export const FeesPage: React.FC = () => {
  // ── UPDATED: user?.name ki jagah studentId directly UserContext se ─────────
  const { studentId } = useUser() as any;
  const { invoices, summary, loading, error, refetch } = useFees(studentId);
  const [filter, setFilter] = useState<FilterType>('All');
  const [voucherInvoice, setVoucherInvoice] = useState<FeeInvoice | null>(null);

  const filters: FilterType[] = ['All', 'Unpaid', 'Overdue', 'Paid', 'Partially Paid'];

  const filtered = filter === 'All'
    ? invoices
    : invoices.filter((inv) => inv.status === filter);

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Fee Details</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track your invoices and payment history</p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="p-2.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all"
          title="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Banknote className="w-5 h-5 text-gray-600" />}
          label="Total Billed"
          value={formatCurrency(summary.totalBilled, summary.currency)}
          sub={`${summary.invoiceCount} invoice${summary.invoiceCount !== 1 ? 's' : ''}`}
          color="bg-gray-50"
          delay={0}
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          label="Total Paid"
          value={formatCurrency(summary.totalPaid, summary.currency)}
          color="bg-green-50"
          delay={0.05}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-red-500" />}
          label="Outstanding"
          value={formatCurrency(summary.totalOutstanding, summary.currency)}
          color="bg-red-50"
          delay={0.1}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          label="Overdue"
          value={`${summary.overdueCount}`}
          sub={summary.overdueCount > 0 ? 'Need attention' : 'All clear!'}
          color="bg-orange-50"
          delay={0.15}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => {
          const count = f === 'All' ? invoices.length : invoices.filter(i => i.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                filter === f
                  ? 'bg-primary-green text-white shadow-sm shadow-green-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {f}
              {count > 0 && (
                <span className={cn(
                  'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                  filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="w-24 h-6 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={refetch} className="mt-3 text-sm text-red-500 underline">Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {filter !== 'All' ? filter.toLowerCase() : ''} invoices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv, i) => (
            <InvoiceCard
              key={inv.name}
              invoice={inv}
              index={i}
              onViewVoucher={setVoucherInvoice}
            />
          ))}
        </div>
      )}

      {/* Fee Voucher Modal */}
      <FeeVoucherModal
        invoice={voucherInvoice}
        onClose={() => setVoucherInvoice(null)}
      />

    </div>
  );
};
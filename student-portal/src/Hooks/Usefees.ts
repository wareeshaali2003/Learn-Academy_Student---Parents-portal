import { useState, useEffect, useCallback } from 'react';
import { resourceClient } from '../services/erpService';

export interface FeeItem {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface PaymentScheduleEntry {
  due_date: string;
  payment_amount: number;
  outstanding: number;
  paid_amount: number;
  invoice_portion: number;
}

export interface FeeInvoice {
  name: string;
  title: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  total_advance: number;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid' | 'Return' | 'Credit Note Issued';
  currency: string;
  fee_schedule?: string;
  items: FeeItem[];
  payment_schedule: PaymentScheduleEntry[];
}

export interface FeeSummary {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
  overdueCount: number;
  currency: string;
}

interface UseFeesReturn {
  invoices: FeeInvoice[];
  summary: FeeSummary;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFees(studentId: string | undefined): UseFeesReturn {
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFees = useCallback(async () => {
    if (!studentId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch Sales Invoices linked to this student
      const res: any = await resourceClient.get('Sales Invoice', {
        params: {
          filters: JSON.stringify([
            ['student', '=', studentId],
            ['docstatus', '=', 1],
          ]),
          fields: JSON.stringify([
            'name', 'title', 'customer', 'customer_name',
            'posting_date', 'due_date', 'grand_total',
            'outstanding_amount', 'total_advance', 'status',
            'currency', 'fee_schedule',
          ]),
          order_by: 'posting_date desc',
          limit_page_length: 100,
        },
      });

      const invoiceList: any[] = res?.data || [];

      // Fetch full details (items + payment_schedule) for each invoice
      const detailed = await Promise.all(
        invoiceList.map(async (inv: any) => {
          try {
            const detail: any = await resourceClient.get(
              `Sales Invoice/${encodeURIComponent(inv.name)}`
            );
            const d = detail?.data || {};
            return {
              name: inv.name,
              title: inv.title || inv.customer_name,
              customer: inv.customer,
              customer_name: inv.customer_name,
              posting_date: inv.posting_date,
              due_date: inv.due_date,
              grand_total: inv.grand_total,
              outstanding_amount: inv.outstanding_amount,
              total_advance: inv.total_advance || 0,
              status: inv.status,
              currency: inv.currency || 'PKR',
              fee_schedule: inv.fee_schedule,
              items: (d.items || []).map((item: any) => ({
                item_code: item.item_code,
                item_name: item.item_name,
                description: item.description,
                qty: item.qty,
                rate: item.rate,
                amount: item.amount,
              })),
              payment_schedule: (d.payment_schedule || []).map((ps: any) => ({
                due_date: ps.due_date,
                payment_amount: ps.payment_amount,
                outstanding: ps.outstanding,
                paid_amount: ps.paid_amount,
                invoice_portion: ps.invoice_portion,
              })),
            } as FeeInvoice;
          } catch {
            return {
              name: inv.name,
              title: inv.title || inv.customer_name,
              customer: inv.customer,
              customer_name: inv.customer_name,
              posting_date: inv.posting_date,
              due_date: inv.due_date,
              grand_total: inv.grand_total,
              outstanding_amount: inv.outstanding_amount,
              total_advance: inv.total_advance || 0,
              status: inv.status,
              currency: inv.currency || 'PKR',
              fee_schedule: inv.fee_schedule,
              items: [],
              payment_schedule: [],
            } as FeeInvoice;
          }
        })
      );

      setInvoices(detailed);
    } catch (err: any) {
      console.error('[useFees] error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const summary: FeeSummary = invoices.reduce(
    (acc, inv) => ({
      totalBilled: acc.totalBilled + inv.grand_total,
      totalPaid: acc.totalPaid + (inv.grand_total - inv.outstanding_amount),
      totalOutstanding: acc.totalOutstanding + inv.outstanding_amount,
      invoiceCount: acc.invoiceCount + 1,
      overdueCount: acc.overdueCount + (inv.status === 'Overdue' ? 1 : 0),
      currency: inv.currency || acc.currency,
    }),
    { totalBilled: 0, totalPaid: 0, totalOutstanding: 0, invoiceCount: 0, overdueCount: 0, currency: 'PKR' }
  );

  return { invoices, summary, loading, error, refetch: fetchFees };
}
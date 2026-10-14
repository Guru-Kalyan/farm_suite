import React, { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '../../api/purchases';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const TradeProfitPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('this_month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (datePreset) params.date_preset = datePreset;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await purchasesApi.getTradeDashboard(params);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load trade profitability dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [datePreset, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleClearFilters = () => {
    setDatePreset('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Trade Profit & Margin Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Comprehensive analysis of trade purchases, inventory landed cost, cost of goods sold, and net trading margins
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => onNavigate('/purchases')}>
            ← Trade Purchases
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('/trade/sales')}>
            Trade Sales List →
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'flex-end'
      }}>
        <div style={{ minWidth: '160px' }}>
          <Select
            label="Date Range Preset"
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              setFromDate('');
              setToDate('');
            }}
            options={[
              { value: '', label: 'Custom Range' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'this_week', label: 'This Week' },
              { value: 'this_month', label: 'This Month' },
              { value: 'prev_month', label: 'Previous Month' }
            ]}
          />
        </div>

        {!datePreset && (
          <>
            <div style={{ minWidth: '140px' }}>
              <Input
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div style={{ minWidth: '140px' }}>
              <Input
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </>
        )}

        <Button variant="ghost" onClick={handleClearFilters}>
          Reset
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Computing trade profitability metrics and inventory cost valuations...
        </div>
      ) : data ? (
        <>
          {/* Key Profit Indicators */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Trade Sales Revenue
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)', marginTop: '6px' }}>
                {formatCurrency(data.total_trade_sales_revenue)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                From {data.trade_sales_count} trade sales invoices
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Cost of Goods Sold (COGS)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '6px' }}>
                {formatCurrency(data.total_cost_of_goods_sold)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Landed cost of stock sold via FIFO
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Net Trade Profit
              </div>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: '800',
                color: parseFloat(data.net_trade_profit) >= 0 ? 'var(--success)' : 'var(--danger)',
                marginTop: '6px'
              }}>
                {formatCurrency(data.net_trade_profit)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Gross Profit: {formatCurrency(data.gross_profit)}
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Profit Margin %
              </div>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: '800',
                color: parseFloat(data.profit_margin_percent) >= 0 ? 'var(--success)' : 'var(--danger)',
                marginTop: '6px'
              }}>
                {parseFloat(data.profit_margin_percent).toFixed(2)}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                (Net Trade Profit ÷ Revenue) × 100
              </div>
            </div>
          </div>

          {/* Detailed Financial & Cost Breakdown */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '20px'
          }}>
            {/* Procurement & Landed Valuation */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem' }}>Procurement & Landed Valuation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Procurement Invoiced:</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(data.total_procurement_cost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '12px', color: 'var(--text-muted)' }}>
                  <span>• Inbound Transport:</span>
                  <span>{formatCurrency(data.procurement_transport)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '12px', color: 'var(--text-muted)' }}>
                  <span>• Inbound Packaging:</span>
                  <span>{formatCurrency(data.procurement_packaging)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Disbursed to Vendors:</span>
                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(data.total_paid_to_vendors)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Outstanding Vendor Payables:</span>
                  <span style={{ fontWeight: '800', color: 'var(--danger)' }}>{formatCurrency(data.vendor_payables)}</span>
                </div>
              </div>
            </div>

            {/* Selling Expenses & Customer Cashflow */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem' }}>Selling Expenses & Collections</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Outbound Transport (Delivery):</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(data.selling_transport)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Outbound Packaging:</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(data.selling_packaging)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Other Attributable Selling Expenses:</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(data.selling_other_expenses)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Collected from Customers:</span>
                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(data.total_received_from_customers)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Outstanding Customer Receivables:</span>
                  <span style={{ fontWeight: '800', color: 'var(--danger)' }}>{formatCurrency(data.customer_receivables)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Accounting Notes Banner */}
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6'
          }}>
            <b>Accounting Transparency & FIFO Costing Rule:</b>
            <br />
            Procurement transport, packaging, and inbound costs are allocated directly into the landed inventory unit cost upon stock receipt. When goods are sold, those costs are recognized strictly as <b>Cost of Goods Sold (COGS)</b> via FIFO. They are <i>never</i> deducted a second time as separate expenses, guaranteeing zero double-counting while preserving true margin accuracy.
          </div>
        </>
      ) : null}
    </div>
  );
};

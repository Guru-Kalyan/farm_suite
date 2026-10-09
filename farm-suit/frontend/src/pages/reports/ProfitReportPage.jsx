import React, { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../../api/reports';
import { KpiCard } from '../../components/common/KpiCard';
import { Button } from '../../components/common/Button';
import { SourceBadge } from '../../components/common/SourceBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const ProfitReportPage = () => {
  const { addToast } = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sourceType, setSourceType] = useState('');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (sourceType) params.source_type = sourceType;

      const res = await reportsApi.getProfit(params);
      if (res && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load profitability report', 'error');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, sourceType, addToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading && !report) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Deriving transactional profitability analytics...
      </div>
    );
  }

  const { summary = {}, by_channel = [], by_item = [], details = [] } = report || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Derived Profitability Analysis</h1>
        <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
          Real-time transactional gross margins comparing Indirect Trading vs Direct In-House Farming
        </p>
      </div>

      {/* Date & Channel Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          style={{
            padding: '7px 12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '13px'
          }}
        >
          <option value="">All Channels (Trading & Farming)</option>
          <option value="PURCHASE">Purchased Goods Only</option>
          <option value="HARVEST">Farm Produced Only</option>
        </select>

        <Button variant="secondary" size="sm" onClick={() => { setFromDate(''); setToDate(''); setSourceType(''); }}>
          Reset Filters
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <KpiCard
          title="Total Sales Revenue"
          value={formatCurrency(summary.total_revenue)}
          subtitle={`${summary.total_sales_count || 0} posted sales invoices`}
          icon="📈"
          variant="primary"
        />
        <KpiCard
          title="Cost of Goods Sold (COGS)"
          value={formatCurrency(summary.total_cogs)}
          subtitle="Authoritative FIFO lot costs"
          icon="🏷️"
          variant="default"
        />
        <KpiCard
          title="Gross Profit"
          value={formatCurrency(summary.total_gross_profit)}
          subtitle={`Net Margin: ${summary.margin_percentage || '0.0%'}`}
          icon="₹"
          variant="success"
        />
      </div>

      {/* Channel Comparison Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>
          Channel Profitability: Indirect Trading vs Direct Farming
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Channel Source</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Revenue (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>COGS (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Profit (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Margin %</th>
              </tr>
            </thead>
            <tbody>
              {by_channel.map((c, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <SourceBadge source={c.source_type} />
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                    {formatCurrency(c.revenue)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {formatCurrency(c.cogs)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                    {formatCurrency(c.profit)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>
                    {c.margin_pct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item-Wise Breakdown Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Item-Wise Profitability</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Units Sold</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Revenue (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>COGS (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Profit (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {by_item.map((it) => (
                <tr key={it.item_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px' }}><b>{it.item_name}</b></td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{it.category}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                    {it.total_quantity} {it.unit}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(it.revenue)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatCurrency(it.cogs)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                    {formatCurrency(it.profit)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>
                    {it.margin_pct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactional Ledger */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Detailed Transaction Lines</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Invoice</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lot Source</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>COGS</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d, idx) => (
                <tr key={d.line_id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 10px' }}>{formatDate(d.bill_date)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: '700', color: 'var(--primary)' }}>{d.bill_number}</td>
                  <td style={{ padding: '8px 10px' }}>{d.customer}</td>
                  <td style={{ padding: '8px 10px' }}>{d.item_name}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{d.lot_number}</span>
                    <span style={{ marginLeft: '4px' }}><SourceBadge source={d.source_type} /></span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{d.quantity} {d.unit}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(d.revenue)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatCurrency(d.cogs)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                    {formatCurrency(d.gross_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../api/reports';
import { KpiCard } from '../../components/common/KpiCard';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const DashboardPage = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.getDashboard()
      .then(res => {
        if (res && res.data) {
          setData(res.data);
        }
      })
      .catch(err => console.error("Error loading dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Farm Suit Executive Dashboard...
      </div>
    );
  }

  const { kpis, trends, low_stock_items, recent_purchases, recent_sales, recent_harvests } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Quick Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Farm Business Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '2px 0 0 0' }}>
            Unified real-time tracking for Indirect Trading and In-House Cultivation
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/purchases/new')}>
            📥 + New Purchase
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/harvests/new')}>
            🚜 + Record Harvest
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('/sales/new')}>
            🧾 + New Sales Bill
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        <KpiCard
          title="Total Inventory Stock"
          value={`${kpis.total_stock} Units`}
          subtitle={`Purchased: ${kpis.purchased_stock} | Farm: ${kpis.farm_produced_stock}`}
          icon="📦"
          variant="primary"
          onClick={() => onNavigate('/inventory')}
        />
        <KpiCard
          title="Inventory Valuation"
          value={formatCurrency(kpis.inventory_valuation)}
          subtitle="At authoritative FIFO unit cost"
          icon="🏷️"
          variant="accent"
          onClick={() => onNavigate('/inventory/lots')}
        />
        <KpiCard
          title="Monthly Sales Revenue"
          value={formatCurrency(kpis.monthly_sales)}
          subtitle={`Today: ${formatCurrency(kpis.today_sales)}`}
          icon="📈"
          variant="default"
          onClick={() => onNavigate('/sales')}
        />
        <KpiCard
          title="Monthly Gross Profit"
          value={formatCurrency(kpis.monthly_profit)}
          subtitle={`Today: ${formatCurrency(kpis.today_profit)}`}
          icon="💰"
          variant="success"
          onClick={() => onNavigate('/reports/profit')}
        />
      </div>

      {/* Visual Trends & Channel Distribution */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        {/* 7-Day Performance Bars */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Sales & Profit Trend (Last 7 Days)</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Daily Financials</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', paddingTop: '20px', gap: '8px' }}>
            {trends.map((t, idx) => {
              const salesVal = parseFloat(t.sales || 0);
              const profitVal = parseFloat(t.profit || 0);
              const maxVal = Math.max(...trends.map(x => parseFloat(x.sales || 0)), 100);
              const salesHeight = Math.min(Math.round((salesVal / maxVal) * 120), 120);
              const profitHeight = Math.min(Math.round((profitVal / maxVal) * 120), 120);

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }}>
                    <div
                      title={`Sales: ${formatCurrency(salesVal)}`}
                      style={{
                        width: '12px',
                        height: `${Math.max(salesHeight, 4)}px`,
                        backgroundColor: 'var(--primary)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s'
                      }}
                    />
                    <div
                      title={`Profit: ${formatCurrency(profitVal)}`}
                      style={{
                        width: '12px',
                        height: `${Math.max(profitHeight, 4)}px`,
                        backgroundColor: 'var(--accent)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {t.date}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--primary)', borderRadius: '2px' }} /> Sales Revenue
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent)', borderRadius: '2px' }} /> Gross Profit
            </span>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚠️ Low Stock Watchlist
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600' }}>
              {low_stock_items.length} items need reorder
            </span>
          </div>

          {low_stock_items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              🎉 All item inventories are healthy above minimum thresholds!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {low_stock_items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-surface-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{it.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>[{it.item_code}]</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--danger)', fontWeight: '700', fontSize: '13px' }}>
                      {it.available} {it.unit}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Min: {it.minimum} {it.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feeds */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Recent Purchases */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Recent Purchase Bills</h4>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('/purchases')}>View All →</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent_purchases.map(b => (
              <div key={b.id} onClick={() => onNavigate(`/purchases/${b.id}`)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{b.bill_number}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.vendor} • {formatDate(b.bill_date)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700' }}>{formatCurrency(b.total)}</div>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Recent Sales Bills</h4>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('/sales')}>View All →</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent_sales.map(s => (
              <div key={s.id} onClick={() => onNavigate(`/sales/${s.id}`)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{s.bill_number}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.customer} • {formatDate(s.bill_date)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700' }}>{formatCurrency(s.total)}</div>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Harvests */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Recent Harvests</h4>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('/harvests')}>View All →</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent_harvests.map(h => (
              <div key={h.id} onClick={() => onNavigate(`/harvests/${h.id}`)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{h.harvest_number}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.crop} on {h.plot}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700' }}>{h.quantity} {h.unit}</div>
                  <StatusBadge status={h.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

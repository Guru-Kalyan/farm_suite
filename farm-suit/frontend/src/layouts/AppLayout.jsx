import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { AuditTimeline } from '../components/audit/AuditTimeline';

export const AppLayout = ({
  children,
  activePath = '/dashboard',
  onNavigate,
  auditTarget: propAuditTarget,
  onOpenAudit: propOpenAudit,
  onCloseAudit: propCloseAudit
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
  const [collapsed, setCollapsed] = useState(false);     // Tablet / desktop collapse
  const [internalAuditTarget, setInternalAuditTarget] = useState(null);

  const activeAuditTarget = propAuditTarget !== undefined ? propAuditTarget : internalAuditTarget;
  const handleCloseAudit = propCloseAudit || (() => setInternalAuditTarget(null));

  // Auto-close mobile sidebar on navigation or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navGroups = [
    {
      label: 'Main',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' }
      ]
    },
    {
      label: 'Masters',
      items: [
        { path: '/items', label: 'Items & Products', icon: '🍎' },
        { path: '/categories', label: 'Categories', icon: '🏷️' },
        { path: '/units', label: 'Units of Measure', icon: '⚖️' },
        { path: '/vendors', label: 'Vendors', icon: '🏢' },
        { path: '/customers', label: 'Customers', icon: '👥' },
        { path: '/farm-plots', label: 'Farm Plots', icon: '🗺️' }
      ]
    },
    {
      label: 'Indirect Trading',
      items: [
        { path: '/purchases', label: 'Purchase Bills', icon: '📥' }
      ]
    },
    {
      label: 'Direct Farming',
      items: [
        { path: '/cultivation', label: 'Cultivation Batches', icon: '🌱' },
        { path: '/harvests', label: 'Harvest Records', icon: '🚜' }
      ]
    },
    {
      label: 'Unified Inventory',
      items: [
        { path: '/inventory', label: 'Stock Overview', icon: '📦' },
        { path: '/inventory/lots', label: 'Inventory Lots', icon: '🔢' },
        { path: '/inventory/movements', label: 'Stock Ledger', icon: '📋' }
      ]
    },
    {
      label: 'Sales & Billing',
      items: [
        { path: '/sales', label: 'Sales Bills & Invoices', icon: '🧾' }
      ]
    },
    {
      label: 'Reports & Analytics',
      items: [
        { path: '/reports/profit', label: 'Derived Profit Report', icon: '💰' },
        { path: '/reports/sales', label: 'Sales Analysis', icon: '📈' },
        { path: '/reports/purchases', label: 'Procurement Report', icon: '📉' },
        { path: '/reports/inventory', label: 'Inventory Valuation', icon: '🏷️' }
      ]
    },
    {
      label: 'System History',
      items: [
        { path: '/audit', label: 'Audit Trail', icon: '🕘' }
      ]
    }
  ];

  const handleNavClick = (path) => {
    onNavigate(path);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 998
          }}
          className="no-print"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        style={{
          width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 999,
          transform: sidebarOpen || window.innerWidth >= 1024 ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition-base), width var(--transition-base)',
          boxShadow: sidebarOpen ? 'var(--shadow-xl)' : 'none'
        }}
        className="sidebar-container no-print"
      >
        {/* Brand Header */}
        <div style={{
          height: 'var(--header-height)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <span style={{ fontSize: '24px' }}>🌱</span>
            {!collapsed && (
              <div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '800', fontSize: '1.2rem', color: 'var(--primary)', lineHeight: 1.1 }}>
                  FARM SUIT
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  BUSINESS SUITE
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: window.innerWidth < 1024 ? 'none' : 'block',
              fontSize: '14px',
              padding: '4px'
            }}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 10px' }}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '18px' }}>
              {!collapsed && (
                <div style={{
                  padding: '4px 10px',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}>
                  {group.label}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                {group.items.map((item) => {
                  const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      title={collapsed ? item.label : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: collapsed ? '10px 0' : '9px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        backgroundColor: isActive ? 'var(--primary-subtle)' : 'transparent',
                        color: isActive ? 'var(--primary-text)' : 'var(--text-secondary)',
                        fontWeight: isActive ? '700' : '500',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer Profile */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between'
        }}>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: '700', fontSize: '12.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username || 'Admin'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.is_superuser ? 'Administrator' : 'Staff Member'}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Log out"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            🚪
          </button>
        </div>
      </aside>

      {/* Main Body */}
      <div style={{
        flex: 1,
        marginLeft: window.innerWidth >= 1024 ? (collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)') : 0,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'margin-left var(--transition-base)'
      }}>
        {/* Top Header */}
        <header
          style={{
            height: 'var(--header-height)',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            boxShadow: 'var(--shadow-xs)'
          }}
          className="no-print"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: window.innerWidth < 1024 ? 'flex' : 'none',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              ☰
            </button>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Farm Suit Management
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThemeToggle />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '13px' }}>👤</span>
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>{user?.username}</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }} className="main-content">
          {children}
        </main>
      </div>

      {/* Global Audit Timeline Drawer */}
      {activeAuditTarget && (
        <AuditTimeline
          isOpen={Boolean(activeAuditTarget)}
          onClose={handleCloseAudit}
          model={activeAuditTarget.model}
          objectId={activeAuditTarget.id}
        />
      )}
    </div>
  );
};

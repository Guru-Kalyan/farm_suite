import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { AuditTimeline } from '../components/audit/AuditTimeline';
import { ForcePasswordChangeModal } from '../components/common/ForcePasswordChangeModal';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

export const AppLayout = ({
  children,
  activePath = '/dashboard',
  onNavigate,
  auditTarget: propAuditTarget,
  onOpenAudit: propOpenAudit,
  onCloseAudit: propCloseAudit
}) => {
  const { user, logout, hasPermission, hasAnyPermission, changePassword } = useAuth();
  const { addToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [internalAuditTarget, setInternalAuditTarget] = useState(null);

  // Self-service password change modal state
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const activeAuditTarget = propAuditTarget !== undefined ? propAuditTarget : internalAuditTarget;
  const handleCloseAudit = propCloseAudit || (() => setInternalAuditTarget(null));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter dynamic navigation groups based on granular user permissions
  const navGroups = useMemo(() => {
    const allGroups = [
      {
        label: 'Main',
        items: [
          { path: '/dashboard', label: 'Dashboard', icon: '📊', requiredPerm: 'dashboard.view' }
        ]
      },
      {
        label: 'Masters',
        items: [
          { path: '/items', label: 'Items & Products', icon: '🍎', requiredPerm: 'inventory.view' },
          { path: '/categories', label: 'Categories', icon: '🏷️', requiredPerm: 'inventory.view' },
          { path: '/units', label: 'Units of Measure', icon: '⚖️', requiredPerm: 'inventory.view' },
          { path: '/vendors', label: 'Vendors', icon: '🏢', requiredPerm: 'vendors.view' },
          { path: '/customers', label: 'Customers', icon: '👥', requiredPerm: 'customers.view' },
          { path: '/farm-plots', label: 'Farm Plots', icon: '🗺️', requiredPerm: 'farms.view' }
        ]
      },
      {
        label: 'Indirect Trading',
        items: [
          { path: '/purchases', label: 'Purchase Bills', icon: '📥', requiredPerm: 'purchases.view' }
        ]
      },
      {
        label: 'Direct Farming',
        items: [
          { path: '/cultivation', label: 'Cultivation Batches', icon: '🌱', requiredPerm: 'crops.view' },
          { path: '/harvests', label: 'Harvest Records', icon: '🚜', requiredPerm: 'crops.view' }
        ]
      },
      {
        label: 'Unified Inventory',
        items: [
          { path: '/inventory', label: 'Stock Overview', icon: '📦', requiredPerm: 'inventory.view' },
          { path: '/inventory/lots', label: 'Inventory Lots', icon: '🔢', requiredPerm: 'inventory.view' },
          { path: '/inventory/movements', label: 'Stock Ledger', icon: '📋', requiredPerm: 'inventory.view' }
        ]
      },
      {
        label: 'Sales & Billing',
        items: [
          { path: '/sales', label: 'Sales Bills & Invoices', icon: '🧾', requiredPerm: 'sales.view' }
        ]
      },
      {
        label: 'Reports & Analytics',
        items: [
          { path: '/reports/profit', label: 'Derived Profit Report', icon: '💰', requiredPerm: 'reports.view' },
          { path: '/reports/sales', label: 'Sales Analysis', icon: '📈', requiredPerm: 'reports.view' },
          { path: '/reports/purchases', label: 'Procurement Report', icon: '📉', requiredPerm: 'reports.view' },
          { path: '/reports/inventory', label: 'Inventory Valuation', icon: '🏷️', requiredPerm: 'reports.view' }
        ]
      },
      {
        label: 'Administration',
        items: [
          { path: '/admin/users', label: 'Users', icon: '👥', requiredPerm: 'users.view' },
          { path: '/admin/roles', label: 'Roles', icon: '🛡️', requiredPerm: 'roles.view' },
          { path: '/admin/permissions', label: 'Permissions', icon: '🔑', requiredPerm: 'permissions.view' },
          { path: '/admin/security', label: 'Security Settings', icon: '⚙️', requiredPerm: 'settings.view' },
          { path: '/admin/audit', label: 'Audit Logs', icon: '🕘', requiredPerm: 'audit_logs.view' }
        ]
      }
    ];

    return allGroups.map((group) => {
      const visibleItems = group.items.filter((item) => {
        if (!item.requiredPerm) return true;
        return hasPermission(item.requiredPerm);
      });
      return { ...group, items: visibleItems };
    }).filter((group) => group.items.length > 0);
  }, [hasPermission]);

  const handleNavClick = (path) => {
    onNavigate(path);
    setSidebarOpen(false);
  };

  const handleSelfPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All fields are required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    try {
      setPwdLoading(true);
      setPwdError('');
      await changePassword(currentPwd, newPwd, confirmPwd);
      addToast('Password updated successfully.', 'success');
      setPwdModalOpen(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setPwdError(err.message || 'Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  const canViewAuditHistory = user?.is_admin || hasPermission('audit_logs.view');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Forced Password Change Modal */}
      <ForcePasswordChangeModal />

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

        {/* Dynamic Navigation Items */}
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
                {user?.first_name || user?.username || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                {user?.is_admin ? 'Administrator' : (user?.role?.name || 'Staff')}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setPwdModalOpen(true)}
              title="Change Password"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)'
              }}
            >
              🔑
            </button>
            <button
              onClick={logout}
              title="Sign out of Farm Suit"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)'
              }}
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
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
            <div
              onClick={() => setPwdModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                backgroundColor: 'var(--bg-surface-secondary)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
              title="Click to view user settings / change password"
            >
              <span style={{ fontSize: '12px' }}>👤</span>
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>{user?.username}</span>
              <span style={{
                fontSize: '10.5px',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--primary-text)',
                fontWeight: '700'
              }}>
                {user?.is_admin ? 'Admin' : (user?.role?.name || 'Staff')}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }} className="main-content">
          {children}
        </main>
      </div>

      {/* Change Password Self-Service Modal */}
      {pwdModalOpen && (
        <Modal
          isOpen={pwdModalOpen}
          onClose={() => setPwdModalOpen(false)}
          title="Change Account Password"
          maxWidth="440px"
        >
          <form onSubmit={handleSelfPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pwdError && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: 'var(--danger-subtle)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger-text)',
                fontSize: '12.5px'
              }}>
                {pwdError}
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Enter current password"
            />

            <Input
              label="New Password"
              type="password"
              required
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Minimum 6 characters"
            />

            <Input
              label="Confirm New Password"
              type="password"
              required
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Confirm new password"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setPwdModalOpen(false)} disabled={pwdLoading}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={pwdLoading}>
                Update Password
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Global Audit Timeline Drawer: only active for users who can view audit history */}
      {activeAuditTarget && canViewAuditHistory && (
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

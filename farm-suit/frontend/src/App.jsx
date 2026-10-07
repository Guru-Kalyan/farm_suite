import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { AccessRestricted } from './components/common/AccessRestricted';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Dashboard
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Masters
import { ItemsPage } from './pages/masters/ItemsPage';
import { CategoriesPage } from './pages/masters/CategoriesPage';
import { UnitsPage } from './pages/masters/UnitsPage';
import { VendorsPage } from './pages/masters/VendorsPage';
import { CustomersPage } from './pages/masters/CustomersPage';
import { FarmPlotsPage } from './pages/masters/FarmPlotsPage';

// Trading (Purchases)
import { PurchaseListPage } from './pages/purchases/PurchaseListPage';
import { PurchaseCreatePage } from './pages/purchases/PurchaseCreatePage';
import { PurchaseDetailPage } from './pages/purchases/PurchaseDetailPage';

// Farming (Cultivation & Harvest)
import { CultivationListPage } from './pages/farming/CultivationListPage';
import { CultivationCreatePage } from './pages/farming/CultivationCreatePage';
import { HarvestListPage } from './pages/farming/HarvestListPage';
import { HarvestCreatePage } from './pages/farming/HarvestCreatePage';

// Inventory
import { StockOverviewPage } from './pages/inventory/StockOverviewPage';
import { StockLotsPage } from './pages/inventory/StockLotsPage';
import { LotDetailPage } from './pages/inventory/LotDetailPage';
import { StockMovementsPage } from './pages/inventory/StockMovementsPage';

// Sales & Billing
import { SalesListPage } from './pages/sales/SalesListPage';
import { SalesCreatePage } from './pages/sales/SalesCreatePage';
import { SalesDetailPage } from './pages/sales/SalesDetailPage';

// Reports
import { ProfitReportPage } from './pages/reports/ProfitReportPage';
import { SalesReportPage } from './pages/reports/SalesReportPage';
import { PurchaseReportPage } from './pages/reports/PurchaseReportPage';
import { InventoryReportPage } from './pages/reports/InventoryReportPage';

// Audit
import { AuditTrailPage } from './pages/audit/AuditTrailPage';

// Administration
import { UsersPage } from './pages/admin/UsersPage';
import { UserDetailPage } from './pages/admin/UserDetailPage';
import { RolesPage } from './pages/admin/RolesPage';
import { PermissionsPage } from './pages/admin/PermissionsPage';
import { SecuritySettingsPage } from './pages/admin/SecuritySettingsPage';

const getRouteFromHash = () => {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/dashboard';
};

const getSidebarActivePath = (path) => {
  if (path.startsWith('/admin/users')) return '/admin/users';
  if (path.startsWith('/admin/roles')) return '/admin/roles';
  if (path.startsWith('/admin/permissions')) return '/admin/permissions';
  if (path.startsWith('/admin/security')) return '/admin/security';
  if (path.startsWith('/admin/audit') || path.startsWith('/audit')) return '/admin/audit';
  if (path.startsWith('/purchases')) return '/purchases';
  if (path.startsWith('/cultivation')) return '/cultivation';
  if (path.startsWith('/harvests')) return '/harvests';
  if (path.startsWith('/sales')) return '/sales';
  if (path.startsWith('/inventory/lots')) return '/inventory/lots';
  if (path.startsWith('/inventory/movements')) return '/inventory/movements';
  if (path.startsWith('/inventory')) return '/inventory';
  if (path.startsWith('/reports/')) return path;
  return path;
};

export const App = () => {
  const { user, loading, hasPermission } = useAuth();
  const [currentPath, setCurrentPath] = useState(getRouteFromHash);
  const [auditTarget, setAuditTarget] = useState(null);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getRouteFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  const handleOpenAudit = (model, id) => {
    // Only open audit if user is authorized
    if (user?.is_admin || hasPermission('audit_logs.view')) {
      setAuditTarget({ model, id });
    }
  };

  const handleCloseAudit = () => {
    setAuditTarget(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        gap: '16px',
        color: 'var(--text-primary)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: 'var(--shadow-md)',
          animation: 'pulse 1.8s infinite ease-in-out'
        }}>
          🌱
        </div>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '1.25rem' }}>
          Farm Suit
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Initializing business management workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );
  }

  // Route resolver with Permission Guard
  const renderRoute = () => {
    // --- ADMINISTRATION ROUTES ---
    const adminUserDetailMatch = currentPath.match(/^\/admin\/users\/(\d+)$/);
    if (adminUserDetailMatch) {
      if (!user.is_admin && !hasPermission('users.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <UserDetailPage userId={adminUserDetailMatch[1]} onNavigate={navigate} />;
    }

    if (currentPath === '/admin/users') {
      if (!user.is_admin && !hasPermission('users.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <UsersPage onNavigate={navigate} />;
    }

    if (currentPath === '/admin/roles') {
      if (!user.is_admin && !hasPermission('roles.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <RolesPage />;
    }

    if (currentPath === '/admin/permissions') {
      if (!user.is_admin && !hasPermission('permissions.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <PermissionsPage />;
    }

    if (currentPath === '/admin/security') {
      if (!user.is_admin && !hasPermission('settings.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <SecuritySettingsPage />;
    }

    // AUDIT LOGS / VIEW CHANGE HISTORY: ADMIN ONLY
    if (currentPath === '/admin/audit' || currentPath === '/audit') {
      if (!user.is_admin && !hasPermission('audit_logs.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <AuditTrailPage onOpenAudit={handleOpenAudit} />;
    }

    // --- PURCHASES (TRADING) ---
    if (currentPath === '/purchases/new') {
      if (!hasPermission('purchases.create')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseCreatePage onNavigate={navigate} />;
    }
    const purchaseDetailMatch = currentPath.match(/^\/purchases\/(\d+)$/);
    if (purchaseDetailMatch) {
      if (!hasPermission('purchases.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseDetailPage id={purchaseDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/purchases') {
      if (!hasPermission('purchases.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    // --- CULTIVATION & HARVEST (FARMING) ---
    if (currentPath === '/cultivation/new') {
      if (!hasPermission('crops.create')) return <AccessRestricted onNavigate={navigate} />;
      return <CultivationCreatePage onNavigate={navigate} />;
    }
    if (currentPath === '/cultivation') {
      if (!hasPermission('crops.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CultivationListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/harvests/new') {
      if (!hasPermission('crops.create')) return <AccessRestricted onNavigate={navigate} />;
      return <HarvestCreatePage onNavigate={navigate} />;
    }
    if (currentPath === '/harvests') {
      if (!hasPermission('crops.view')) return <AccessRestricted onNavigate={navigate} />;
      return <HarvestListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    // --- INVENTORY ---
    const lotDetailMatch = currentPath.match(/^\/inventory\/lots\/(\d+)$/);
    if (lotDetailMatch) {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <LotDetailPage id={lotDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/inventory/lots') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <StockLotsPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/inventory/movements') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <StockMovementsPage onNavigate={navigate} />;
    }
    if (currentPath === '/inventory') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <StockOverviewPage onNavigate={navigate} />;
    }

    // --- SALES & BILLING ---
    if (currentPath === '/sales/new') {
      if (!hasPermission('sales.create')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesCreatePage onNavigate={navigate} />;
    }
    const salesDetailMatch = currentPath.match(/^\/sales\/(\d+)$/);
    if (salesDetailMatch) {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesDetailPage id={salesDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/sales') {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    // --- MASTERS ---
    if (currentPath === '/items') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <ItemsPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/categories') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CategoriesPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/units') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <UnitsPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/vendors') {
      if (!hasPermission('vendors.view')) return <AccessRestricted onNavigate={navigate} />;
      return <VendorsPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/customers') {
      if (!hasPermission('customers.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CustomersPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/farm-plots') {
      if (!hasPermission('farms.view')) return <AccessRestricted onNavigate={navigate} />;
      return <FarmPlotsPage onOpenAudit={handleOpenAudit} />;
    }

    // --- REPORTS ---
    if (currentPath === '/reports/profit') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <ProfitReportPage />;
    }
    if (currentPath === '/reports/sales') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesReportPage />;
    }
    if (currentPath === '/reports/purchases') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseReportPage />;
    }
    if (currentPath === '/reports/inventory') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <InventoryReportPage />;
    }

    // --- DEFAULT: DASHBOARD ---
    if (!hasPermission('dashboard.view')) {
      return <AccessRestricted onNavigate={navigate} />;
    }
    return <DashboardPage onNavigate={navigate} />;
  };

  return (
    <AppLayout
      activePath={getSidebarActivePath(currentPath)}
      onNavigate={navigate}
      auditTarget={auditTarget}
      onOpenAudit={handleOpenAudit}
      onCloseAudit={handleCloseAudit}
    >
      {renderRoute()}
    </AppLayout>
  );
};

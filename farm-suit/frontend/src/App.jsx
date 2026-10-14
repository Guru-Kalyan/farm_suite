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
import { PaymentsReceivedPage } from './pages/sales/PaymentsReceivedPage';

// Trading (Purchases & Trade Sales)
import { PurchaseListPage } from './pages/purchases/PurchaseListPage';
import { PurchaseCreatePage } from './pages/purchases/PurchaseCreatePage';
import { PurchaseDetailPage } from './pages/purchases/PurchaseDetailPage';
import { VendorPaymentsPage } from './pages/purchases/VendorPaymentsPage';
import { TradeSalesListPage } from './pages/purchases/TradeSalesListPage';
import { TradeProfitPage } from './pages/purchases/TradeProfitPage';

// Orders
import { RegularOrdersPage } from './pages/orders/RegularOrdersPage';
import { AdvanceOrdersPage } from './pages/orders/AdvanceOrdersPage';
import { OrderCreatePage } from './pages/orders/OrderCreatePage';
import { OrderDetailPage } from './pages/orders/OrderDetailPage';
import { OrderCalendarPage } from './pages/orders/OrderCalendarPage';

// Accounts & Wallets
import { CustomerAccountsPage } from './pages/accounts/CustomerAccountsPage';
import { CustomerStatementPage } from './pages/accounts/CustomerStatementPage';
import { VendorAccountsPage } from './pages/accounts/VendorAccountsPage';
import { VendorStatementPage } from './pages/accounts/VendorStatementPage';
import { ReceivablesPrioritizationPage } from './pages/accounts/ReceivablesPrioritizationPage';
import { PayablesPrioritizationPage } from './pages/accounts/PayablesPrioritizationPage';
import { TransactionStatementsPage } from './pages/accounts/TransactionStatementsPage';

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

const getSidebarActivePath = (pathWithQuery) => {
  const path = pathWithQuery.split('?')[0];
  if (path.startsWith('/admin/users')) return '/admin/users';
  if (path.startsWith('/admin/roles')) return '/admin/roles';
  if (path.startsWith('/admin/permissions')) return '/admin/permissions';
  if (path.startsWith('/admin/security')) return '/admin/security';
  if (path.startsWith('/admin/audit') || path.startsWith('/audit')) return '/admin/audit';

  // Sales
  if (path === '/sales/create' || path === '/sales/new') return '/sales/create';
  if (path === '/sales/payments') return '/sales/payments';
  if (path.startsWith('/sales')) return '/sales';

  // Trade
  if (path.startsWith('/purchases')) return '/purchases';
  if (path.startsWith('/trade/sales')) return '/trade/sales';
  if (path.startsWith('/trade/vendor-payments')) return '/trade/vendor-payments';
  if (path.startsWith('/trade/profit')) return '/trade/profit';

  // Orders
  if (path.startsWith('/orders/regular')) return '/orders/regular';
  if (path.startsWith('/orders/advance')) return '/orders/advance';
  if (path.startsWith('/orders/calendar')) return '/orders/calendar';
  if (path.startsWith('/orders')) return '/orders/regular';

  // Accounts
  if (path.startsWith('/accounts/customers')) return '/accounts/customers';
  if (path.startsWith('/accounts/vendors')) return '/accounts/vendors';
  if (path.startsWith('/accounts/receivables')) return '/accounts/receivables';
  if (path.startsWith('/accounts/payables')) return '/accounts/payables';
  if (path.startsWith('/accounts/statements')) return '/accounts/statements';

  if (path.startsWith('/cultivation')) return '/cultivation';
  if (path.startsWith('/harvests')) return '/harvests';
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
    const [pathname, searchStr] = currentPath.split('?');
    const searchParams = new URLSearchParams(searchStr || '');

    // --- ADMINISTRATION ROUTES ---
    const adminUserDetailMatch = pathname.match(/^\/admin\/users\/(\d+)$/);
    if (adminUserDetailMatch) {
      if (!user.is_admin && !hasPermission('users.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <UserDetailPage userId={adminUserDetailMatch[1]} onNavigate={navigate} />;
    }

    if (pathname === '/admin/users') {
      if (!user.is_admin && !hasPermission('users.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <UsersPage onNavigate={navigate} />;
    }

    if (pathname === '/admin/roles') {
      if (!user.is_admin && !hasPermission('roles.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <RolesPage />;
    }

    if (pathname === '/admin/permissions') {
      if (!user.is_admin && !hasPermission('permissions.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <PermissionsPage />;
    }

    if (pathname === '/admin/security') {
      if (!user.is_admin && !hasPermission('settings.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <SecuritySettingsPage />;
    }

    // AUDIT LOGS / VIEW CHANGE HISTORY: ADMIN ONLY
    if (pathname === '/admin/audit' || pathname === '/audit') {
      if (!user.is_admin && !hasPermission('audit_logs.view')) {
        return <AccessRestricted onNavigate={navigate} />;
      }
      return <AuditTrailPage onOpenAudit={handleOpenAudit} />;
    }

    // --- TRADE & PURCHASES ---
    if (pathname === '/trade/profit') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <TradeProfitPage onNavigate={navigate} />;
    }
    if (pathname === '/trade/sales') {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <TradeSalesListPage onNavigate={navigate} />;
    }
    if (pathname === '/trade/vendor-payments') {
      if (!hasPermission('purchases.view')) return <AccessRestricted onNavigate={navigate} />;
      return <VendorPaymentsPage onNavigate={navigate} />;
    }
    if (pathname === '/purchases/create' || pathname === '/purchases/new') {
      if (!hasPermission('purchases.create')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseCreatePage onNavigate={navigate} />;
    }
    const purchaseDetailMatch = pathname.match(/^\/purchases\/(\d+)$/);
    if (purchaseDetailMatch) {
      if (!hasPermission('purchases.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseDetailPage id={purchaseDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/purchases') {
      if (!hasPermission('purchases.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    // --- ORDERS MODULE ---
    if (pathname === '/orders/create' || pathname === '/orders/new') {
      if (!hasPermission('sales.create')) return <AccessRestricted onNavigate={navigate} />;
      return <OrderCreatePage onNavigate={navigate} initialType={searchParams.get('type') || 'REGULAR'} />;
    }
    if (pathname === '/orders/calendar') {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <OrderCalendarPage onNavigate={navigate} />;
    }
    if (pathname === '/orders/advance') {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <AdvanceOrdersPage onNavigate={navigate} />;
    }
    if (pathname === '/orders/regular') {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <RegularOrdersPage onNavigate={navigate} />;
    }
    const orderDetailMatch = pathname.match(/^\/orders\/(\d+)$/);
    if (orderDetailMatch) {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <OrderDetailPage id={orderDetailMatch[1]} onNavigate={navigate} />;
    }

    // --- ACCOUNTS & WALLETS ---
    const customerStatementMatch = pathname.match(/^\/accounts\/customers\/(\d+)\/statement$/);
    if (customerStatementMatch) {
      if (!hasPermission('customers.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CustomerStatementPage id={customerStatementMatch[1]} onNavigate={navigate} />;
    }
    if (pathname === '/accounts/customers') {
      if (!hasPermission('customers.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CustomerAccountsPage onNavigate={navigate} />;
    }
    const vendorStatementMatch = pathname.match(/^\/accounts\/vendors\/(\d+)\/statement$/);
    if (vendorStatementMatch) {
      if (!hasPermission('vendors.view')) return <AccessRestricted onNavigate={navigate} />;
      return <VendorStatementPage id={vendorStatementMatch[1]} onNavigate={navigate} />;
    }
    if (pathname === '/accounts/vendors') {
      if (!hasPermission('vendors.view')) return <AccessRestricted onNavigate={navigate} />;
      return <VendorAccountsPage onNavigate={navigate} />;
    }
    if (pathname === '/accounts/receivables') {
      if (!hasPermission('customers.view')) return <AccessRestricted onNavigate={navigate} />;
      return <ReceivablesPrioritizationPage onNavigate={navigate} />;
    }
    if (pathname === '/accounts/payables') {
      if (!hasPermission('vendors.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PayablesPrioritizationPage onNavigate={navigate} />;
    }
    if (pathname === '/accounts/statements') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <TransactionStatementsPage onNavigate={navigate} />;
    }

    // --- CULTIVATION & HARVEST (FARMING) ---
    if (pathname === '/cultivation/new') {
      if (!hasPermission('crops.create')) return <AccessRestricted onNavigate={navigate} />;
      return <CultivationCreatePage onNavigate={navigate} />;
    }
    if (pathname === '/cultivation') {
      if (!hasPermission('crops.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CultivationListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/harvests/new') {
      if (!hasPermission('crops.create')) return <AccessRestricted onNavigate={navigate} />;
      return <HarvestCreatePage onNavigate={navigate} />;
    }
    if (pathname === '/harvests') {
      if (!hasPermission('crops.view')) return <AccessRestricted onNavigate={navigate} />;
      return <HarvestListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    // --- INVENTORY ---
    const lotDetailMatch = pathname.match(/^\/inventory\/lots\/(\d+)$/);
    if (lotDetailMatch) {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <LotDetailPage id={lotDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/inventory/lots') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <StockLotsPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/inventory/movements') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <StockMovementsPage onNavigate={navigate} />;
    }
    if (pathname === '/inventory') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <StockOverviewPage onNavigate={navigate} />;
    }

    // --- SALES & BILLING ---
    if (pathname === '/sales/payments') {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PaymentsReceivedPage onNavigate={navigate} />;
    }
    if (pathname === '/sales/create' || pathname === '/sales/new') {
      if (!hasPermission('sales.create')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesCreatePage onNavigate={navigate} initialSaleType={searchParams.get('type') || 'REGULAR'} />;
    }
    const salesDetailMatch = pathname.match(/^\/sales\/(\d+)$/);
    if (salesDetailMatch) {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesDetailPage id={salesDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/sales') {
      if (!hasPermission('sales.view')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    // --- MASTERS ---
    if (pathname === '/items') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <ItemsPage onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/categories') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CategoriesPage onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/units') {
      if (!hasPermission('inventory.view')) return <AccessRestricted onNavigate={navigate} />;
      return <UnitsPage onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/vendors') {
      if (!hasPermission('vendors.view')) return <AccessRestricted onNavigate={navigate} />;
      return <VendorsPage onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/customers') {
      if (!hasPermission('customers.view')) return <AccessRestricted onNavigate={navigate} />;
      return <CustomersPage onOpenAudit={handleOpenAudit} />;
    }
    if (pathname === '/farm-plots') {
      if (!hasPermission('farms.view')) return <AccessRestricted onNavigate={navigate} />;
      return <FarmPlotsPage onOpenAudit={handleOpenAudit} />;
    }

    // --- REPORTS ---
    if (pathname === '/reports/profit') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <ProfitReportPage />;
    }
    if (pathname === '/reports/sales') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <SalesReportPage />;
    }
    if (pathname === '/reports/purchases') {
      if (!hasPermission('reports.view')) return <AccessRestricted onNavigate={navigate} />;
      return <PurchaseReportPage />;
    }
    if (pathname === '/reports/inventory') {
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

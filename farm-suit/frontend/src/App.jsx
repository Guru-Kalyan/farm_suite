import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';

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

const getRouteFromHash = () => {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/dashboard';
};

const getSidebarActivePath = (path) => {
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
  const { user, loading } = useAuth();
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
    setAuditTarget({ model, id });
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

  // Route resolver
  const renderRoute = () => {
    // Dynamic matching
    if (currentPath === '/purchases/new') {
      return <PurchaseCreatePage onNavigate={navigate} />;
    }
    const purchaseDetailMatch = currentPath.match(/^\/purchases\/(\d+)$/);
    if (purchaseDetailMatch) {
      return <PurchaseDetailPage id={purchaseDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/purchases') {
      return <PurchaseListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    if (currentPath === '/cultivation/new') {
      return <CultivationCreatePage onNavigate={navigate} />;
    }
    if (currentPath === '/cultivation') {
      return <CultivationListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    if (currentPath === '/harvests/new') {
      return <HarvestCreatePage onNavigate={navigate} />;
    }
    if (currentPath === '/harvests') {
      return <HarvestListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    const lotDetailMatch = currentPath.match(/^\/inventory\/lots\/(\d+)$/);
    if (lotDetailMatch) {
      return <LotDetailPage id={lotDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/inventory/lots') {
      return <StockLotsPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/inventory/movements') {
      return <StockMovementsPage onNavigate={navigate} />;
    }
    if (currentPath === '/inventory') {
      return <StockOverviewPage onNavigate={navigate} />;
    }

    if (currentPath === '/sales/new') {
      return <SalesCreatePage onNavigate={navigate} />;
    }
    const salesDetailMatch = currentPath.match(/^\/sales\/(\d+)$/);
    if (salesDetailMatch) {
      return <SalesDetailPage id={salesDetailMatch[1]} onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/sales') {
      return <SalesListPage onNavigate={navigate} onOpenAudit={handleOpenAudit} />;
    }

    if (currentPath === '/items') {
      return <ItemsPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/categories') {
      return <CategoriesPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/units') {
      return <UnitsPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/vendors') {
      return <VendorsPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/customers') {
      return <CustomersPage onOpenAudit={handleOpenAudit} />;
    }
    if (currentPath === '/farm-plots') {
      return <FarmPlotsPage onOpenAudit={handleOpenAudit} />;
    }

    if (currentPath === '/reports/profit') {
      return <ProfitReportPage />;
    }
    if (currentPath === '/reports/sales') {
      return <SalesReportPage />;
    }
    if (currentPath === '/reports/purchases') {
      return <PurchaseReportPage />;
    }
    if (currentPath === '/reports/inventory') {
      return <InventoryReportPage />;
    }

    if (currentPath === '/audit') {
      return <AuditTrailPage onOpenAudit={handleOpenAudit} />;
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

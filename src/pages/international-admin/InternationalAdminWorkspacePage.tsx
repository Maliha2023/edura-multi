import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  InternationalAdminShell,
  type InternationalAdminTab,
} from '../../components/international-admin/InternationalAdminShell';
import { InternationalOverviewTab } from '../../components/international-admin/InternationalOverviewTab';
import { InternationalCouponsTab } from '../../components/international-admin/InternationalCouponsTab';
import { InternationalUsersTab } from '../../components/international-admin/InternationalUsersTab';
import { InternationalNoticesTab } from '../../components/international-admin/InternationalNoticesTab';
import { InternationalSettingsTab } from '../../components/international-admin/InternationalSettingsTab';
import {
  internationalAdminService,
  resolveInternationalPathway,
} from '../../services/internationalAdminService';

export function InternationalAdminWorkspacePage({
  initialTab = 'overview',
}: {
  initialTab?: InternationalAdminTab;
}) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InternationalAdminTab>(initialTab);
  const [refreshTick, setRefreshTick] = useState(0);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const pathway = resolveInternationalPathway(session?.selectedPathway);

  const metrics = useMemo(() => {
    if (!pathway) return null;
    return internationalAdminService.getOverviewMetrics(pathway);
  }, [pathway, refreshTick]);

  const activities = useMemo(() => {
    if (!pathway) return [];
    return internationalAdminService.listActivities(pathway, 10);
  }, [pathway, refreshTick]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Strictly enforce International Curriculum pathway isolation (Cambridge / Edexcel only)
  if (!pathway || !metrics) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleDataChanged = () => {
    setRefreshTick((prev) => prev + 1);
  };

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    logout();
    window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 0);
  };

  return (
    <InternationalAdminShell
      pathway={pathway}
      adminEmail={session.email}
      activeTab={activeTab}
      pendingCount={metrics.pendingApprovals}
      logoutModalOpen={logoutModalOpen}
      onOpenLogoutModal={() => setLogoutModalOpen(true)}
      onCloseLogoutModal={() => setLogoutModalOpen(false)}
      onSelectTab={setActiveTab}
      onConfirmLogout={handleConfirmLogout}
    >
      {activeTab === 'overview' && (
        <InternationalOverviewTab
          pathway={pathway}
          metrics={metrics}
          activities={activities}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'coupons' && (
        <InternationalCouponsTab
          pathway={pathway}
          adminEmail={session.email}
          onDataChanged={handleDataChanged}
        />
      )}

      {activeTab === 'users' && (
        <InternationalUsersTab
          pathway={pathway}
          adminEmail={session.email}
          onDataChanged={handleDataChanged}
        />
      )}

      {activeTab === 'notices' && (
        <InternationalNoticesTab
          pathway={pathway}
          adminEmail={session.email}
          onDataChanged={handleDataChanged}
        />
      )}

      {activeTab === 'settings' && (
        <InternationalSettingsTab
          pathway={pathway}
          onRequestLogout={() => setLogoutModalOpen(true)}
          onDataChanged={handleDataChanged}
        />
      )}
    </InternationalAdminShell>
  );
}

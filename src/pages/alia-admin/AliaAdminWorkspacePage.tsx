import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AliaAdminShell,
  type AliaAdminTab,
} from '../../components/alia-admin/AliaAdminShell';
import { AliaOverviewTab } from '../../components/alia-admin/AliaOverviewTab';
import { AliaCouponsTab } from '../../components/alia-admin/AliaCouponsTab';
import { AliaUsersTab } from '../../components/alia-admin/AliaUsersTab';
import { AliaNoticesTab } from '../../components/alia-admin/AliaNoticesTab';
import { AliaSettingsTab } from '../../components/alia-admin/AliaSettingsTab';
import {
  aliaAdminService,
  resolveAliaAdminPathway,
} from '../../services/aliaAdminService';

export function AliaAdminWorkspacePage({
  initialTab = 'overview',
}: {
  initialTab?: AliaAdminTab;
}) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AliaAdminTab>(initialTab);
  const [refreshTick, setRefreshTick] = useState(0);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const pathway = resolveAliaAdminPathway(session?.selectedPathway);

  const metrics = useMemo(() => {
    void refreshTick;
    if (!pathway) return null;
    return aliaAdminService.getOverviewMetrics();
  }, [pathway, refreshTick]);

  const activities = useMemo(() => {
    void refreshTick;
    if (!pathway) return [];
    return aliaAdminService.listActivities(10);
  }, [pathway, refreshTick]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Strictly enforce Alia Madrasa pathway isolation
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
    <AliaAdminShell
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
        <AliaOverviewTab
          metrics={metrics}
          activities={activities}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'coupons' && (
        <AliaCouponsTab adminEmail={session.email} onDataChanged={handleDataChanged} />
      )}

      {activeTab === 'users' && (
        <AliaUsersTab adminEmail={session.email} onDataChanged={handleDataChanged} />
      )}

      {activeTab === 'notices' && (
        <AliaNoticesTab adminEmail={session.email} onDataChanged={handleDataChanged} />
      )}

      {activeTab === 'settings' && (
        <AliaSettingsTab
          onRequestLogout={() => setLogoutModalOpen(true)}
          onDataChanged={handleDataChanged}
        />
      )}
    </AliaAdminShell>
  );
}

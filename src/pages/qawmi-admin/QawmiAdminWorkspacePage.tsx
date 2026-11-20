import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  QawmiAdminShell,
  type QawmiAdminTab,
} from '../../components/qawmi-admin/QawmiAdminShell';
import { QawmiOverviewTab } from '../../components/qawmi-admin/QawmiOverviewTab';
import { QawmiCouponsTab } from '../../components/qawmi-admin/QawmiCouponsTab';
import { QawmiUsersTab } from '../../components/qawmi-admin/QawmiUsersTab';
import { QawmiNoticesTab } from '../../components/qawmi-admin/QawmiNoticesTab';
import { QawmiSettingsTab } from '../../components/qawmi-admin/QawmiSettingsTab';
import {
  qawmiAdminService,
  resolveQawmiAdminPathway,
} from '../../services/qawmiAdminService';

export function QawmiAdminWorkspacePage({
  initialTab = 'overview',
}: {
  initialTab?: QawmiAdminTab;
}) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<QawmiAdminTab>(initialTab);
  const [refreshTick, setRefreshTick] = useState(0);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const pathway = resolveQawmiAdminPathway(session?.selectedPathway);

  const metrics = useMemo(() => {
    void refreshTick;
    if (!pathway) return null;
    return qawmiAdminService.getOverviewMetrics();
  }, [pathway, refreshTick]);

  const activities = useMemo(() => {
    void refreshTick;
    if (!pathway) return [];
    return qawmiAdminService.listActivities(10);
  }, [pathway, refreshTick]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Strictly enforce Qawmi Madrasa pathway isolation
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
    <QawmiAdminShell
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
        <QawmiOverviewTab
          metrics={metrics}
          activities={activities}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'coupons' && (
        <QawmiCouponsTab adminEmail={session.email} onDataChanged={handleDataChanged} />
      )}

      {activeTab === 'users' && (
        <QawmiUsersTab adminEmail={session.email} onDataChanged={handleDataChanged} />
      )}

      {activeTab === 'notices' && (
        <QawmiNoticesTab adminEmail={session.email} onDataChanged={handleDataChanged} />
      )}

      {activeTab === 'settings' && (
        <QawmiSettingsTab
          onRequestLogout={() => setLogoutModalOpen(true)}
          onDataChanged={handleDataChanged}
        />
      )}
    </QawmiAdminShell>
  );
}

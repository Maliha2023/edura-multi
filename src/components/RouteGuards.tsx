import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { CurriculumSubTrack, UserRole } from '../types/domain';

export function getDashboardPathForRole(
  role: UserRole,
  selectedPathway?: CurriculumSubTrack | string | null
): string {
  switch (role) {
    case 'student':
      if (selectedPathway === 'Cambridge' || selectedPathway === 'Edexcel') {
        return '/student-intl/dashboard';
      }
      if (selectedPathway === 'Alia') {
        return '/student-alia/dashboard';
      }
      if (selectedPathway === 'Qawmi') {
        return '/student-qawmi/dashboard';
      }
      return '/student/dashboard';
    case 'teacher':
      if (selectedPathway === 'Cambridge' || selectedPathway === 'Edexcel') {
        return '/teacher-intl/dashboard';
      }
      if (selectedPathway === 'Alia') {
        return '/teacher-alia/dashboard';
      }
      if (selectedPathway === 'Qawmi') {
        return '/teacher-qawmi/dashboard';
      }
      return '/teacher/dashboard';
    case 'admin':
      if (selectedPathway === 'Cambridge' || selectedPathway === 'Edexcel') {
        return '/admin/international';
      }
      if (selectedPathway === 'Alia') {
        return '/admin/alia';
      }
      if (selectedPathway === 'Qawmi') {
        return '/admin/qawmi';
      }
      return '/admin/dashboard';
  }
}

export function RoleProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return (
      <Navigate
        to={getDashboardPathForRole(session.role, session.selectedPathway)}
        state={{ notAllowed: true }}
        replace
      />
    );
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  if (session) {
    if (session.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to={getDashboardPathForRole(session.role, session.selectedPathway)} replace />;
  }

  return <>{children}</>;
}

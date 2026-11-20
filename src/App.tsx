/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PublicOnlyRoute, RoleProtectedRoute } from './components/RouteGuards';
import { WelcomeCurriculumPage } from './pages/WelcomeCurriculumPage';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { CouponEntryPage } from './pages/CouponEntryPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminCouponsPage } from './pages/AdminCouponsPage';
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminNoticesPage } from './pages/AdminNoticesPage';
import { StudentCouponOnboardingPage } from './pages/student/StudentCouponOnboardingPage';
import { StudentWorkspacePage } from './pages/student/StudentWorkspacePage';
import { TeacherCouponOnboardingPage } from './pages/teacher/TeacherCouponOnboardingPage';
import { TeacherWorkspacePage } from './pages/teacher/TeacherWorkspacePage';
import { InternationalAdminWorkspacePage } from './pages/international-admin/InternationalAdminWorkspacePage';
import { AliaAdminWorkspacePage } from './pages/alia-admin/AliaAdminWorkspacePage';
import { QawmiAdminWorkspacePage } from './pages/qawmi-admin/QawmiAdminWorkspacePage';
import { IntlStudentCouponOnboardingPage } from './pages/student-intl/IntlStudentCouponOnboardingPage';
import { IntlStudentWorkspacePage } from './pages/student-intl/IntlStudentWorkspacePage';
import { IntlTeacherCouponOnboardingPage } from './pages/teacher-intl/IntlTeacherCouponOnboardingPage';
import { IntlTeacherWorkspacePage } from './pages/teacher-intl/IntlTeacherWorkspacePage';
import { AliaStudentCouponOnboardingPage } from './pages/student-alia/AliaStudentCouponOnboardingPage';
import { AliaStudentWorkspacePage } from './pages/student-alia/AliaStudentWorkspacePage';
import { AliaTeacherCouponOnboardingPage } from './pages/teacher-alia/AliaTeacherCouponOnboardingPage';
import { AliaTeacherWorkspacePage } from './pages/teacher-alia/AliaTeacherWorkspacePage';
import { QawmiStudentCouponOnboardingPage } from './pages/student-qawmi/QawmiStudentCouponOnboardingPage';
import { QawmiStudentWorkspacePage } from './pages/student-qawmi/QawmiStudentWorkspacePage';
import { QawmiTeacherCouponOnboardingPage } from './pages/teacher-qawmi/QawmiTeacherCouponOnboardingPage';
import { QawmiTeacherWorkspacePage } from './pages/teacher-qawmi/QawmiTeacherWorkspacePage';
import {
  AdminPaymentsPage,
  StudentPaymentLedgerPage,
  StudentProgressPage,
  StudentStudyPlanPage,
} from './pages/RoleDashboards';

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <WelcomeCurriculumPage />
                </PublicOnlyRoute>
              }
            />

            {/* Public Auth & Onboarding Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/coupon"
              element={
                <PublicOnlyRoute>
                  <CouponEntryPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <PublicOnlyRoute>
                  <OnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/student/coupon"
              element={
                <PublicOnlyRoute>
                  <StudentCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/teacher/coupon"
              element={
                <PublicOnlyRoute>
                  <TeacherCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/student-intl/coupon"
              element={
                <PublicOnlyRoute>
                  <IntlStudentCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/teacher-intl/coupon"
              element={
                <PublicOnlyRoute>
                  <IntlTeacherCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/student-alia/coupon"
              element={
                <PublicOnlyRoute>
                  <AliaStudentCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/teacher-alia/coupon"
              element={
                <PublicOnlyRoute>
                  <AliaTeacherCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/student-qawmi/coupon"
              element={
                <PublicOnlyRoute>
                  <QawmiStudentCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/teacher-qawmi/coupon"
              element={
                <PublicOnlyRoute>
                  <QawmiTeacherCouponOnboardingPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            {/* Student Routes */}
            <Route
              path="/student/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <StudentWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student-intl/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <IntlStudentWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student-alia/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <AliaStudentWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student-qawmi/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <QawmiStudentWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student/payment-ledger"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <StudentPaymentLedgerPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student/course-modules"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <StudentWorkspacePage initialTab="subjects" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student/study-plan"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <StudentStudyPlanPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student/progress"
              element={
                <RoleProtectedRoute allowedRoles={['student']}>
                  <StudentProgressPage />
                </RoleProtectedRoute>
              }
            />

            {/* Teacher Routes */}
            <Route
              path="/teacher/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['teacher']}>
                  <TeacherWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher-intl/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['teacher']}>
                  <IntlTeacherWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher-alia/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['teacher']}>
                  <AliaTeacherWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher-qawmi/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['teacher']}>
                  <QawmiTeacherWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher/attendance"
              element={
                <RoleProtectedRoute allowedRoles={['teacher']}>
                  <TeacherWorkspacePage initialTab="roster" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher/grading"
              element={
                <RoleProtectedRoute allowedRoles={['teacher']}>
                  <TeacherWorkspacePage initialTab="roster" />
                </RoleProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/international"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <InternationalAdminWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/alia"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AliaAdminWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/qawmi"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <QawmiAdminWorkspacePage initialTab="overview" />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminCouponsPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/registrations"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminRegistrationsPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/notices"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminNoticesPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminPaymentsPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminUsersPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminSettingsPage />
                </RoleProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
    </ThemeProvider>
  );
}

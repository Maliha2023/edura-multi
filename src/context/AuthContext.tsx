import React, { createContext, useContext, useState } from 'react';
import type { AuthSession, UserAccount, UserRole } from '../types/domain';
import {
  authService,
  type LoginCurriculumContext,
  type LoginResult,
} from '../services/authService';
import { useI18n } from '../i18n';

interface AuthContextValue {
  session: AuthSession | null;
  profile: Omit<UserAccount, 'passwordHash'> | null;
  login: (
    identifier: string,
    password: string,
    expectedRole?: UserRole,
    context?: LoginCurriculumContext
  ) => LoginResult;
  logout: () => void;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    authService.getCurrentSession()
  );
  const [profile, setProfile] = useState<Omit<UserAccount, 'passwordHash'> | null>(() =>
    authService.getCurrentUserProfile()
  );
  const { setLanguage } = useI18n();

  const refreshSession = () => {
    const current = authService.getCurrentSession();
    setSession(current);
    setProfile(authService.getCurrentUserProfile());
  };

  const login = (
    identifier: string,
    password: string,
    expectedRole?: UserRole,
    context?: LoginCurriculumContext
  ): LoginResult => {
    const result = authService.login(identifier, password, Date.now(), expectedRole, context);
    if (result.ok) {
      setSession(result.session);
      setProfile(authService.getCurrentUserProfile());
      setLanguage(result.session.preferredLanguage);
    }
    return result;
  };

  const logout = () => {
    authService.logout();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

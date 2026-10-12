import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Role, UserSession } from '../types';

interface AuthContextValue {
  user: UserSession | null;
  loading: boolean;
  signIn(email: string, password: string, demoRole: Role): Promise<UserSession>;
  signOut(): Promise<void>;
  switchRole(role: Role): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
function readSession(): UserSession | null {
  try { return JSON.parse(localStorage.getItem('srg_user') ?? 'null') as UserSession | null; } catch { return null; }
}

const demoNames: Record<Role, string> = {
  SCHOOL: 'GHSS Kolar School Official',
  NGO: 'Science Foundation Officer',
  ADMIN: 'District Science Officer',
  FIELD_COORDINATOR: 'Kolar Field Coordinator',
};

const demoEmails: Record<Role, string> = {
  SCHOOL: 'school.kolar@gov.example',
  NGO: 'program@science-foundation.example',
  ADMIN: 'district.office@gov.example',
  FIELD_COORDINATOR: 'coordinator.kolar@gov.example',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(readSession);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.auth.restoreSession().then((session) => {
      if (active) {
        setUser(session);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signIn(email, password, role) { const session = await api.auth.login(email, password, role); setUser(session); return session; },
    async signOut() { await api.auth.logout(); setUser(null); },
    switchRole(role: Role) {
      const updated: UserSession = {
        user_id: `usr-${role.toLowerCase()}`,
        role,
        full_name: demoNames[role],
        email: demoEmails[role],
      };
      localStorage.setItem('srg_user', JSON.stringify(updated));
      setUser(updated);
    },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

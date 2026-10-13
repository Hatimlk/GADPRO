import { createContext, useContext, type ReactNode } from 'react';
import { useApp } from '../../lib/AppContext';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const access = app.currentUser?.accesses?.find((item) => item.module === 'impayes');
  const user = app.currentUser && access ? {
    id: access.legacyUserId || app.currentUser.centralId || String(app.currentUser.id),
    nom: app.currentUser.name,
    email: app.currentUser.email,
    role: access.role,
    actif: app.currentUser.status === 'Actif',
  } as User : null;
  const login = async (email: string, password: string) => {
    const error = await app.login(email, password);
    if (error) throw new Error(error);
    return user as User;
  };
  return <AuthContext.Provider value={{ user, loading: !app.initialized, login, logout: app.logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}


import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  /** False until the first is_admin() answer for the current user arrives. */
  adminChecked: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Supabase fires events on tab focus and token refresh. Keep the same object when nothing changed,
      // so pages keyed on the session do not reload and overwrite what the founder is typing.
      setSession((prev) => (prev?.access_token === s?.access_token && prev?.user.id === s?.user.id ? prev : s));
      setLoading(false);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    // The database decides. This flag only hides admin UI; RLS and Edge Functions protect the data.
    let active = true;
    supabase.rpc('is_admin').then(({ data }) => { if (active) setAdmin({ userId, isAdmin: data === true }); });
    return () => { active = false; };
  }, [userId]);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    isAdmin: !!userId && admin?.userId === userId && admin.isAdmin,
    adminChecked: !userId || admin?.userId === userId,
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

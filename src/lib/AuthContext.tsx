import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  lastKnownUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [lastKnownUser, setLastKnownUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('last_known_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth Event: ${event}`);
      
      if (event === 'SIGNED_OUT') {
        // If we are offline, don't clear state immediately as it might be a refresh error
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          console.log("Offline SIGNED_OUT event ignored to preserve local session.");
          return;
        }
        setSession(null);
        setUser(null);
        setIsSuperAdmin(false);
        setAdminChecked(true);
        setLoading(false);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        setLastKnownUser(session.user);
        localStorage.setItem('last_known_user', JSON.stringify(session.user));
        setAdminChecked(false);
        // Only check admin if we have a user and something changed
        setTimeout(async () => {
          try {
            const { data } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .eq('role', 'super_admin')
              .maybeSingle();
            setIsSuperAdmin(!!data);
          } catch (err) {
            console.error("Error checking admin status:", err);
          } finally {
            setAdminChecked(true);
          }
        }, 0);
        setLoading(false);
      } else {
        // Fallback for INITIAL_SESSION with no user
        setAdminChecked(true);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session fetch error:", error);
      }
      if (session) {
        setSession(session);
        setUser(session.user);
        setLastKnownUser(session.user);
        localStorage.setItem('last_known_user', JSON.stringify(session.user));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLastKnownUser(null);
    localStorage.removeItem('last_known_user');
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isSuperAdmin,
    signUp,
    signIn,
    signOut,
    lastKnownUser
  }), [user, session, loading, isSuperAdmin, lastKnownUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getOperatorRole } from '../lib/canonical-client';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  role: string | null;
  isAuthReady: boolean;
  isLocalRecovery: boolean;
  setLocalRecoveryRole: (role: string) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const localRecoveryUser = {
  id: "local-recovery-operator",
  email: "operator@mission-control.local",
  user_metadata: {
    full_name: "Local Recovery Operator",
  },
} as unknown as User;

const LOCAL_RECOVERY_ROLE_KEY = "mission-control.localRecoveryRole";

function getStoredLocalRecoveryRole() {
  if (typeof window === "undefined") return "operator";
  const storedRole = window.localStorage.getItem(LOCAL_RECOVERY_ROLE_KEY);
  return storedRole || "operator";
}

function shouldUseLocalRecoveryAuth() {
  if (!isSupabaseConfigured) return true;
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const latestRoleRequestRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (shouldUseLocalRecoveryAuth()) {
      setUser(localRecoveryUser);
      setRole(getStoredLocalRecoveryRole());
      setIsAuthReady(true);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setRole(null);
        latestRoleRequestRef.current = session.user.id;
        fetchRole(session.user.id);
      } else {
        setIsAuthReady(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setRole(null);
        latestRoleRequestRef.current = session.user.id;
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setIsAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    if (shouldUseLocalRecoveryAuth()) {
      setUser(localRecoveryUser);
      setRole(getStoredLocalRecoveryRole());
      setIsAuthReady(true);
      return;
    }

    try {
      const nextRole = await getOperatorRole(userId);

      if (nextRole) {
        if (latestRoleRequestRef.current === userId) {
          setRole(nextRole);
        }
      } else {
        if (latestRoleRequestRef.current === userId) {
          setRole(null);
        }
      }
    } catch (e) {
      console.error("Error fetching role:", e);
      if (latestRoleRequestRef.current === userId) {
        setRole(null);
      }
    } finally {
      if (latestRoleRequestRef.current === userId) {
        setIsAuthReady(true);
      }
    }
  };

  const signInWithGoogle = async () => {
    if (shouldUseLocalRecoveryAuth()) {
      setUser(localRecoveryUser);
      setRole(getStoredLocalRecoveryRole());
      setIsAuthReady(true);
      return;
    }

    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const logout = async () => {
    if (shouldUseLocalRecoveryAuth()) {
      setUser(localRecoveryUser);
      setRole(getStoredLocalRecoveryRole());
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const setLocalRecoveryRole = (nextRole: string) => {
    if (!shouldUseLocalRecoveryAuth()) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_RECOVERY_ROLE_KEY, nextRole);
    }
    setUser(localRecoveryUser);
    setRole(nextRole);
    setIsAuthReady(true);
  };

  return (
    <AuthContext.Provider value={{ user, role, isAuthReady, isLocalRecovery: shouldUseLocalRecoveryAuth(), setLocalRecoveryRole, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

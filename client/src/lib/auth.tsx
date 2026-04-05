import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { requestPasswordReset as requestPasswordResetAction, signIn as signInAction, signUp as signUpAction } from "@/actions/auth";

type AuthContextValue = {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; hasSession?: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error || !data.session) {
        await supabase.auth.signOut({ scope: "local" });
        setUserEmail(null);
        setUserName(null);
        setIsAuthLoading(false);
        return;
      }

      setUserEmail(data.session.user.email ?? null);
      setUserName(data.session.user.user_metadata?.full_name ?? null);
      setIsAuthLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setUserName(session?.user.user_metadata?.full_name ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    return signInAction(email, password);
  };

  const signUp = async (email: string, password: string) => {
    return signUpAction(email, password);
  };

  const requestPasswordReset = async (email: string) => {
    return requestPasswordResetAction(email);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(userEmail),
      userEmail,
      userName,
      isAuthLoading,
      login,
      signUp,
      requestPasswordReset,
      logout,
    }),
    [userEmail, userName, isAuthLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

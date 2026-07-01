import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getToken, logout as logoutApi } from '@/services/auth';

type AuthContextType = {
  hasToken: boolean | null;
  checkToken: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    console.log("[AuthProvider] MOUNTED, reading token...");
    getToken().then((token) => {
      console.log("[AuthProvider] getToken resolved:", token ? "has token" : "no token");
      setHasToken(!!token);
    });
    return () => console.log("[AuthProvider] UNMOUNTED");
  }, []);

  async function checkToken() {
    const token = await getToken();
    setHasToken(!!token);
  }

  async function signOut() {
    console.log("[AuthContext] signOut called, clearing token...");
    await logoutApi();
    console.log("[AuthContext] token cleared, setting hasToken=false");
    setHasToken(false);
  }

  return (
    <AuthContext.Provider value={{ hasToken, checkToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

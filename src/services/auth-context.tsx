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
    getToken().then((token) => setHasToken(!!token));
  }, []);

  async function checkToken() {
    const token = await getToken();
    setHasToken(!!token);
  }

  async function signOut() {
    await logoutApi();
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

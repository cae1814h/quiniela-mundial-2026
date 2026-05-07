import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { User } from "@workspace/api-client-react";

const TOKEN_KEY = "quiniela_token";
const USER_KEY = "quiniela_user";
const LOGIN_AT_KEY = "quiniela_login_at";
const SESSION_MS = 12 * 60 * 60 * 1000;

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    clearSessionTimer();
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(LOGIN_AT_KEY),
    ]);
    setAuthTokenGetter(null);
    setToken(null);
    setUser(null);
  }, [clearSessionTimer]);

  useEffect(() => {
    (async () => {
      try {
        const [t, u, loginAt] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(LOGIN_AT_KEY),
        ]);
        const age = loginAt ? Date.now() - Number(loginAt) : null;
        if (t && u && loginAt && age !== null && age < SESSION_MS) {
          setToken(t);
          setAuthTokenGetter(() => t);
          setUser(JSON.parse(u));
          clearSessionTimer();
          sessionTimerRef.current = setTimeout(() => {
            void logout();
          }, SESSION_MS - age);
        } else {
          await Promise.all([
            AsyncStorage.removeItem(TOKEN_KEY),
            AsyncStorage.removeItem(USER_KEY),
            AsyncStorage.removeItem(LOGIN_AT_KEY),
          ]);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
    return () => clearSessionTimer();
  }, [clearSessionTimer, logout]);

  const login = useCallback(async (newToken: string, newUser: User) => {
    const now = String(Date.now());
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
      AsyncStorage.setItem(LOGIN_AT_KEY, now),
    ]);
    clearSessionTimer();
    sessionTimerRef.current = setTimeout(() => {
      void logout();
    }, SESSION_MS);
    setAuthTokenGetter(() => newToken);
    setToken(newToken);
    setUser(newUser);
  }, [clearSessionTimer, logout]);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

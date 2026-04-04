"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const SESSION_STORAGE_KEY = "enginx_session_token";

type SessionContextValue = {
  /** `undefined` until hydrated from localStorage */
  token: string | null | undefined;
  setToken: (t: string | null) => void;
  signOutLocal: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    try {
      setTokenState(localStorage.getItem(SESSION_STORAGE_KEY));
    } catch {
      setTokenState(null);
    }
  }, []);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    try {
      if (t) {
        localStorage.setItem(SESSION_STORAGE_KEY, t);
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const signOutLocal = useCallback(() => {
    setToken(null);
  }, [setToken]);

  return (
    <SessionContext.Provider
      value={{ token, setToken, signOutLocal }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}

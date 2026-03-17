import { useState, useEffect, useCallback, useRef } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refetch: () => void;
}

function fetchAuthUser(
  setUser: (u: AuthUser | null) => void,
  setIsLoading: (v: boolean) => void,
): () => void {
  let cancelled = false;
  setIsLoading(true);

  fetch("/api/auth/user", { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ user: AuthUser | null }>;
    })
    .then((data) => {
      if (!cancelled) {
        setUser(data.user ?? null);
        setIsLoading(false);
      }
    })
    .catch(() => {
      if (!cancelled) {
        setUser(null);
        setIsLoading(false);
      }
    });

  return () => { cancelled = true; };
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(() => {
    fetchAuthUser(setUser, setIsLoading);
  }, []);

  useEffect(() => {
    const cancel = fetchAuthUser(setUser, setIsLoading);
    return () => { cancel(); };
  }, []);

  const login = useCallback(() => {
    const base = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";
    const loginUrl = `/api/login?returnTo=${encodeURIComponent("/api/auth/popup-close")}`;

    if (pollRef.current) clearInterval(pollRef.current);

    const popup = window.open(
      loginUrl,
      "marketclaw_login",
      "width=520,height=640,left=200,top=100,toolbar=no,menubar=no,scrollbars=yes,resizable=yes",
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = `/api/login?returnTo=${encodeURIComponent(base)}`;
      return;
    }

    popupRef.current = popup;

    pollRef.current = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        popupRef.current = null;
        fetchAuthUser(setUser, setIsLoading);
      }
    }, 400);
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refetch,
  };
}

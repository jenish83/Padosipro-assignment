import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Me } from '../api/endpoints';
import { ApiError, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { tokenStorage } from '../storage/tokenStorage';

/**
 * The whole navigation flow is derived from this one status, so the user can never land on a wrong screen:
 *  loading       -> checking the saved session on app start
 *  error         -> could not reach the server on start (retry / log out shown)
 *  signedOut     -> Login / Register / Verify email
 *  needsProfile  -> first-login profile form (shown only until it is saved)
 *  needsTasks    -> task selection
 *  ready         -> home screen
 */
export type AuthStatus = 'loading' | 'error' | 'signedOut' | 'needsProfile' | 'needsTasks' | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  me: Me | null;
  bootError: string | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  setMe: (me: Me) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const statusFromMe = (me: Me): AuthStatus =>
  !me.profileCompleted ? 'needsProfile' : me.selectedTasks.length === 0 ? 'needsTasks' : 'ready';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMeState] = useState<Me | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  const setMe = useCallback((next: Me) => {
    setMeState(next);
    setStatus(statusFromMe(next));
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    await tokenStorage.clear();
    setMeState(null);
    setBootError(null);
    setStatus('signedOut');
  }, []);

  const loadMe = useCallback(async () => {
    setStatus('loading');
    setBootError(null);
    try {
      setMe(await api.getMe());
    } catch (e) {
      // A rejected session already triggered signOut through the unauthorized handler.
      if (e instanceof ApiError && e.status === 401) return;
      setBootError(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }, [setMe]);

  // On app start: restore the saved token so the user stays logged in after a restart.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });
    (async () => {
      const token = await tokenStorage.get();
      if (!token) return setStatus('signedOut');
      setAuthToken(token);
      await loadMe();
    })();
    return () => setUnauthorizedHandler(null);
  }, [loadMe, signOut]);

  const signIn = useCallback(
    async (token: string) => {
      setAuthToken(token);
      await tokenStorage.set(token);
      await loadMe();
    },
    [loadMe]
  );

  const value = useMemo(
    () => ({ status, me, bootError, signIn, signOut, setMe, refresh: loadMe }),
    [status, me, bootError, signIn, signOut, setMe, loadMe]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

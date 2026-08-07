"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStoredUser, logout as clearSession } from "@/lib/auth";

const SessionContext = createContext({ user: null, ready: false, signIn: () => {}, signOut: () => {} });

/**
 * The session lives in localStorage, which the server cannot read. `ready`
 * distinguishes "not signed in" from "not known yet", so the header can hold
 * its shape for one paint instead of flashing Sign in at a signed-in viewer.
 */
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setReady(true);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn: setUser, signOut }), [user, ready, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

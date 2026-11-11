import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService.js";
import { tokenStorage } from "../services/api.js";
import { setLanguage } from "../i18n/index.js";

// The signed-in user's saved language wins over this device's last choice.
const applyUserLanguage = (u) => u?.language && setLanguage(u.language);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authService.me();
      setUser(me);
      applyUserLanguage(me);
    } catch (err) {
      // Only a real "not signed in" answer drops the saved session; if the
      // server is slow or unreachable, show the login page but keep the token.
      if (err?.response) tokenStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithOtp = useCallback(async (phone, otp) => {
    const result = await authService.loginWithOtp(phone, otp);
    if (result?.isNewUser) return result; // sign-up continues with their details
    setUser(result);
    return result;
  }, []);

  const login = useCallback(async (payload) => {
    const loggedInUser = await authService.login(payload);
    setUser(loggedInUser);
    applyUserLanguage(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    const newUser = await authService.register(payload);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    loginWithOtp,
    register,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("anilog_token") || "");
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("anilog_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const saveAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("anilog_token", nextToken);
    localStorage.setItem("anilog_user", JSON.stringify(nextUser));
  };

  const clearAuth = () => {
    localStorage.removeItem("anilog_token");
    localStorage.removeItem("anilog_user");
    setToken("");
    setUser(null);
  };

  const apiFetch = useCallback(async (path, options = {}) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    if (response.status === 401) {
      clearAuth();
      throw new Error("Session expired. Please log in again.");
    }

    return response;
  }, [token]);

  const login = async ({ email, password }) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Authentication failed.");
    }
    saveAuth(data.token, data.user);
  };

  const register = async ({ name, email, password }) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Authentication failed.");
    }
    saveAuth(data.token, data.user);
  };

  const value = useMemo(
    () => ({ token, user, login, register, logout: clearAuth, apiFetch }),
    [token, user, apiFetch]
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


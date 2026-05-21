import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

function AuthPage() {
  const { login, register } = useAuth();
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    try {
      setAuthError("");
      setAuthLoading(true);
      if (authMode === "login") {
        await login({ email: authForm.email.trim(), password: authForm.password });
      } else {
        await register({
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          password: authForm.password,
        });
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Welcome to AniLog</p>
        <h1>Track anime cleanly.</h1>
        <p className="subtitle">
          Private watchlist, AniList enrichment, and CSV import ready when you are.
        </p>
        <div className="auth-toggle">
          <button
            className={authMode === "login" ? "active" : ""}
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            className={authMode === "register" ? "active" : ""}
            onClick={() => setAuthMode("register")}
          >
            Register
          </button>
        </div>
        <form onSubmit={handleAuthSubmit} className="auth-form">
          {authMode === "register" && (
            <label>
              Name
              <input name="name" value={authForm.name} onChange={handleAuthChange} />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              value={authForm.email}
              onChange={handleAuthChange}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={authForm.password}
              onChange={handleAuthChange}
            />
          </label>
          <button className="primary" type="submit" disabled={authLoading}>
            {authLoading ? "Loading..." : authMode === "login" ? "Login" : "Create account"}
          </button>
          {authError && <p className="error">{authError}</p>}
        </form>
      </div>
      <div className="auth-panel">
        <div className="glass">
          <h2>Why you will love it</h2>
          <ul>
            <li>Strict status tracking with auto-complete logic.</li>
            <li>AniList auto-fetch for posters and totals.</li>
            <li>CSV import for your legacy lists.</li>
          </ul>
        </div>
        <div className="glass">
          <h3>Tip</h3>
          <p>Import your CSV once and AniLog will remember everything.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;

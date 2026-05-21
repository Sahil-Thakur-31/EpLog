import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function NavBar({ navItems, onRefreshHome }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="brand">
        <span className="logo">AniLog</span>
        <span className="tag">Anime watchlist</span>
      </div>
      <div className="nav-links">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="nav-actions">
        {onRefreshHome && (
          <button className="ghost small" type="button" onClick={onRefreshHome}>
            Refresh
          </button>
        )}
        <button className="profile" type="button" onClick={() => navigate("/profile")}>
          {user?.email?.slice(0, 1)?.toUpperCase() || "U"}
        </button>
      </div>
    </nav>
  );
}

export default NavBar;

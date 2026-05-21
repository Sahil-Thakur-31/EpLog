import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NavBar from "./NavBar.jsx";
import AuthPage from "../pages/AuthPage.jsx";
import HomePage from "../pages/HomePage.jsx";
import ListPage from "../pages/ListPage.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import MorePage from "../pages/MorePage.jsx";
import AnimeDetailPage from "../pages/AnimeDetailPage.jsx";

const navItems = [
  { id: "home", label: "Home", to: "/" },
  { id: "list", label: "My List", to: "/list" },
  { id: "more", label: "More", to: "/more" },
];

function AppShell() {
  const { token } = useAuth();

  if (!token) {
    return <AuthPage />;
  }

  return (
    <div className="app">
      <NavBar navItems={navItems} />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/anime/:id" element={<AnimeDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default AppShell;

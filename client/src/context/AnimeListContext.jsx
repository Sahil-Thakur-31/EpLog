import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const AnimeListContext = createContext(null);

export function AnimeListProvider({ children }) {
  const { apiFetch, token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    if (!token) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await apiFetch("/api/anime");
      if (!response.ok) throw new Error("Failed to fetch.");
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message || "Could not load your watchlist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token, apiFetch]);

  const addFromAniList = async (anilistId, options = {}) => {
    const response = await apiFetch("/api/anime/from-anilist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anilistId, ...options }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not add.");
    }
    await refresh();
    return data;
  };

  const quickAdd = async (item) => {
    const total = item.totalEpisodes || 0;
    const nextEpisodes = total > 0
      ? Math.min(total, (item.episodesWatched || 0) + 1)
      : (item.episodesWatched || 0) + 1;
    const nextStatus =
      total > 0 && nextEpisodes >= total ? "Completed" : item.status;
    const response = await apiFetch(`/api/anime/${item._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodesWatched: nextEpisodes,
        totalEpisodes: item.totalEpisodes,
        status: nextStatus,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update.");
    }
    setItems((prev) => prev.map((entry) => (entry._id === data._id ? data : entry)));
    return data;
  };

  const update = async (id, payload) => {
    const response = await apiFetch(`/api/anime/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update.");
    }
    setItems((prev) => prev.map((entry) => (entry._id === data._id ? data : entry)));
    return data;
  };

  const remove = async (id) => {
    const response = await apiFetch(`/api/anime/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to delete.");
    }
    setItems((prev) => prev.filter((item) => item._id !== id));
  };

  const importCsv = async (file, enrich = true) => {
    if (!file) {
      throw new Error("Select a CSV file first.");
    }
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiFetch(`/api/import?enrich=${enrich ? "true" : "false"}`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Import failed.");
    }
    await refresh();
    return data;
  };

  const value = useMemo(
    () => ({
      items,
      loading,
      error,
      refresh,
      addFromAniList,
      quickAdd,
      update,
      remove,
      importCsv,
      setError,
    }),
    [items, loading, error]
  );

  return <AnimeListContext.Provider value={value}>{children}</AnimeListContext.Provider>;
}

export function useAnimeList() {
  const context = useContext(AnimeListContext);
  if (!context) {
    throw new Error("useAnimeList must be used within AnimeListProvider");
  }
  return context;
}

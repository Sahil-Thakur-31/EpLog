import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function useAniListSearch() {
  const { apiFetch } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError("");
      setMessage("");
    }
  }, [query]);

  const search = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Type a title to search AniList.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const response = await apiFetch(`/api/anilist/search?query=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Search failed.");
      }
      setResults(data);
      if (!data.length) {
        setMessage("No results found.");
      }
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    message,
    search,
    setMessage,
  };
}

import React, { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAnimeList } from "../context/AnimeListContext.jsx";
import { buildStats } from "../utils/stats.js";
import { buildCsv } from "../utils/csv.js";

function ProfilePage() {
  const { user, logout } = useAuth();
  const { items, importCsv } = useAnimeList();
  const stats = buildStats(items);
  const [importEnrich, setImportEnrich] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const importInputRef = useRef(null);

  const handleImportPicker = () => {
    if (importInputRef.current) {
      importInputRef.current.value = "";
      importInputRef.current.click();
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      setImporting(true);
      setMessage("");
      const result = await importCsv(file, importEnrich);
      setMessage(`Imported ${result.inserted} entries.`);
    } catch (err) {
      setMessage(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    if (!items.length) {
      setMessage("Nothing to export yet.");
      return;
    }
    const csv = buildCsv(items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anilog-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page">
      <div className="profile-layout">
        <div className="panel profile-card">
          <div className="profile-avatar">{user?.email?.slice(0, 1)?.toUpperCase() || "U"}</div>
          <div>
            <h2>{user?.name || "Anime Fan"}</h2>
            <p className="muted">{user?.email}</p>
          </div>
          <button className="ghost" onClick={logout}>
            Sign out
          </button>
        </div>
        <div className="panel">
          <h3>Your stats</h3>
          <div className="profile-stats">
            <div>
              <span>Total shows</span>
              <strong>{stats.total}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{stats.completed}</strong>
            </div>
            <div>
              <span>Avg score</span>
              <strong>{stats.avgScore}</strong>
            </div>
            <div>
              <span>Completion</span>
              <strong>{stats.completionRate}%</strong>
            </div>
            <div>
              <span>Time spent</span>
              <strong>{stats.timeSpent}</strong>
            </div>
          </div>
        </div>
        <div className="panel">
          <h3>Import / Export</h3>
          <p className="muted">Bring your CSV into AniLog or export your current list.</p>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden-input"
            onChange={(event) => handleImport(event.target.files?.[0] || null)}
          />
          <div className="sidebar-actions">
            <button className="ghost" type="button" onClick={handleImportPicker} disabled={importing}>
              {importing ? "Importing..." : "Import CSV"}
            </button>
            <button className="ghost" type="button" onClick={handleExport}>
              Export CSV
            </button>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={importEnrich}
              onChange={(event) => setImportEnrich(event.target.checked)}
            />
            AniList enrich
          </label>
          {message && <span className="muted">{message}</span>}
        </div>
        <div className="panel">
          <h3>Account</h3>
          <p className="muted">Future settings: theme, export, AniList sync.</p>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;

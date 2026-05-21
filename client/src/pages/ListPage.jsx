import React, { useEffect, useMemo, useState } from "react";
import { useAnimeList } from "../context/AnimeListContext.jsx";
import { useNavigate } from "react-router-dom";
import GenrePicker from "../components/GenrePicker.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import EditListModal from "../components/EditListModal.jsx";
import CreateListModal from "../components/CreateListModal.jsx";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
};

const formatMinutes = (minutes) => {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const seasonOptions = [
  { id: "WINTER", label: "Winter" },
  { id: "SPRING", label: "Spring" },
  { id: "SUMMER", label: "Summer" },
  { id: "FALL", label: "Fall" },
];

const buildYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 30 }, (_, index) => {
    const year = currentYear - index;
    return { id: String(year), label: String(year) };
  });
};


function ListPage() {
  const { items, loading, error, quickAdd, remove, update, setError } = useAnimeList();
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [extraLists, setExtraLists] = useState(() => {
    try {
      const raw = localStorage.getItem("anilog_custom_lists");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [genreOptions, setGenreOptions] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState("");
  const [listGenres, setListGenres] = useState([]);
  const [search, setSearch] = useState("");
  const [releaseStatusFilters, setReleaseStatusFilters] = useState("");
  const [priorityFilters, setPriorityFilters] = useState("");
  const [seasonFilters, setSeasonFilters] = useState("");
  const [yearFilters, setYearFilters] = useState("");
  const [listFilters, setListFilters] = useState("");
  const [listStatusTab, setListStatusTab] = useState("All");
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [createListOpen, setCreateListOpen] = useState(false);
  const [createListSaving, setCreateListSaving] = useState(false);
  const [createListError, setCreateListError] = useState("");

  useEffect(() => {
    const loadGenres = async () => {
      try {
        setGenreLoading(true);
        setGenreError("");
        const response = await apiFetch("/api/anilist/genres");
        if (!response.ok) throw new Error("Failed to load genres.");
        const data = await response.json();
        setGenreOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        setGenreError(err.message || "Could not load genres.");
      } finally {
        setGenreLoading(false);
      }
    };

    loadGenres();
  }, [apiFetch]);

  const availableGenres = useMemo(() => {
    return [...genreOptions].sort((a, b) => a.localeCompare(b));
  }, [genreOptions]);

  const yearOptions = useMemo(() => buildYearOptions(), []);
  const listOptions = useMemo(() => {
    const set = new Set(extraLists);
    items.forEach((item) => {
      (item.customLists || []).forEach((entry) => set.add(entry));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, extraLists]);
  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (!needle) return true;
        const title = item.title?.toLowerCase() || "";
        const altTitle = item.anilistTitle?.toLowerCase() || "";
        return title.includes(needle) || altTitle.includes(needle);
      })
      .filter((item) => (listStatusTab === "All" ? true : item.status === listStatusTab))
      .filter((item) =>
        releaseStatusFilters ? releaseStatusFilters === item.anilistStatus : true
      )
      .filter((item) => (priorityFilters ? priorityFilters === item.priority : true))
      .filter((item) => {
        if (!seasonFilters) return true;
        const season = item.season || item.anilistSeason || "";
        return seasonFilters === season;
      })
      .filter((item) => {
        if (!yearFilters) return true;
        const year = item.seasonYear ? String(item.seasonYear) : "";
        return yearFilters === year;
      })
      .filter((item) => {
        if (!listGenres.length) return true;
        const genres = Array.isArray(item.genres)
          ? item.genres
          : item.genre
          ? [item.genre]
          : [];
        return listGenres.every((genre) => genres.includes(genre));
      })
      .filter((item) => {
        if (!listFilters) return true;
        const lists = Array.isArray(item.customLists) ? item.customLists : [];
        return lists.includes(listFilters);
      });
  }, [
    items,
    search,
    listStatusTab,
    releaseStatusFilters,
    priorityFilters,
    seasonFilters,
    yearFilters,
    listGenres,
    listFilters,
  ]);

  const handleQuickAdd = async (item) => {
    try {
      await quickAdd(item);
    } catch (err) {
      setError(err.message || "Could not update progress.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await remove(id);
    } catch (err) {
      setError(err.message || "Delete failed. Try again.");
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setEditOpen(true);
    setEditError("");
  };

  const handleSaveEdit = async (payload) => {
    if (!editItem) return;
    try {
      setEditSaving(true);
      await update(editItem._id, payload);
      setEditOpen(false);
      setEditItem(null);
    } catch (err) {
      setEditError(err.message || "Update failed.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteFromModal = async () => {
    if (!editItem) return;
    if (!window.confirm("Delete this entry?")) return;
    try {
      setEditSaving(true);
      await remove(editItem._id);
      setEditOpen(false);
      setEditItem(null);
    } catch (err) {
      setEditError(err.message || "Delete failed.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateList = async (name, selectedIds) => {
    const listName = name.trim();
    if (!listName) {
      setCreateListError("List name is required.");
      return;
    }
    try {
      setCreateListSaving(true);
      setCreateListError("");
      setExtraLists((prev) => Array.from(new Set([...prev, listName])));
      if (selectedIds.length) {
        await Promise.all(
          selectedIds.map((id) => {
            const item = items.find((entry) => entry._id === id);
            if (!item) return Promise.resolve();
            const existing = Array.isArray(item.customLists) ? item.customLists : [];
            const nextLists = Array.from(new Set([...existing, listName]));
            return update(item._id, { customLists: nextLists });
          })
        );
      }
      setCreateListOpen(false);
    } catch (err) {
      setCreateListError(err.message || "Could not create list.");
    } finally {
      setCreateListSaving(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem("anilog_custom_lists", JSON.stringify(extraLists));
    } catch {
      // ignore storage errors
    }
  }, [extraLists]);

  return (
    <section className="page">
      <div className="page-layout">
        <aside className="sidebar">
          <h3>Filters</h3>
          <div className="filter-block">
            <label>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles"
            />
          </div>
          <div className="filter-block">
            <label>Release Status</label>
            <select
              value={releaseStatusFilters}
              onChange={(event) => setReleaseStatusFilters(event.target.value)}
            >
              <option value="">All Release Status</option>
              <option value="FINISHED">Finished</option>
              <option value="RELEASING">Releasing</option>
              <option value="NOT_YET_RELEASED">Not Yet Released</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="filter-block">
            <label>Priority</label>
            <select
              value={priorityFilters}
              onChange={(event) => setPriorityFilters(event.target.value)}
            >
              <option value="">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="filter-block">
            <label>Season</label>
            <select value={seasonFilters} onChange={(event) => setSeasonFilters(event.target.value)}>
              <option value="">All Seasons</option>
              {seasonOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-block">
            <label>Year</label>
            <select value={yearFilters} onChange={(event) => setYearFilters(event.target.value)}>
              <option value="">All Years</option>
              {yearOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-block">
            <div className="filter-row">
              <label>Genres</label>
              {listGenres.length > 0 && (
                <button
                  className="icon-button"
                  type="button"
                  title="Clear genres"
                  onClick={() => setListGenres([])}
                >
                  x
                </button>
              )}
            </div>
            {genreLoading ? (
              <span className="muted">Loading genres...</span>
            ) : genreError ? (
              <span className="error">{genreError}</span>
            ) : (
              <GenrePicker
                options={availableGenres.map((genre) => ({ id: genre, label: genre }))}
                values={listGenres}
                onChange={setListGenres}
                placeholder="All Genres"
              />
            )}
          </div>
          <div className="filter-block">
            <label>Lists</label>
            <div className="list-filter-inline">
              <select value={listFilters} onChange={(event) => setListFilters(event.target.value)}>
                <option value="">All Lists</option>
                {listOptions.map((list) => (
                  <option key={list} value={list}>
                    {list}
                  </option>
                ))}
              </select>
              <button
                className="ghost icon-button"
                type="button"
                title="Create list"
                onClick={() => setCreateListOpen(true)}
              >
                +
              </button>
            </div>
          </div>
        </aside>
        <div className="main-content">
          <div className="list-header">
            <div className="list-tabs">
              {["All", "Watching", "Completed", "Planned", "Dropped"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`list-tab ${listStatusTab === tab ? "active" : ""}`}
                  onClick={() => setListStatusTab(tab)}
                >
                  {tab === "Watching" ? "Reading" : tab}
                </button>
              ))}
            </div>
            <button className="primary small" type="button" onClick={() => setCreateListOpen(true)}>
              New List
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {loading ? (
            <p className="muted">Loading watchlist...</p>
          ) : filteredItems.length === 0 ? (
            <p className="muted">No entries yet. Add one to get started.</p>
          ) : (
            <div className="cards list-grid">
              {filteredItems.map((item) => (
                <article
                  className="card clickable"
                  key={item._id}
                  onClick={() => navigate(`/anime/${item.anilistId || item._id}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="card-header">
                    <div className="card-title">
                      <div className="poster">
                        {item.posterUrl ? (
                          <img src={item.posterUrl} alt={item.title} />
                        ) : (
                          <div className="poster-fallback">{item.title?.slice(0, 1)}</div>
                        )}
                      </div>
                      <div>
                        <h3>{item.title}</h3>
                        {item.anilistTitle && item.anilistTitle !== item.title && (
                          <p className="alt-title">{item.anilistTitle}</p>
                        )}
                        <div className="meta meta-inline">
                          <span className={item.status ? `badge ${item.status.toLowerCase()}` : "badge"}>
                            {item.status}
                          </span>
                          <span className={`pill ${item.priority?.toLowerCase()}`}>{item.priority}</span>
                          {item.genre && <span className="pill">{item.genre}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="score">
                      <span>Score</span>
                      <strong>{item.score ?? "-"}</strong>
                    </div>
                  </div>
                  <div className="progress">
                    <div className="progress-bar">
                      <div style={{ width: `${item.progressPercent || 0}%` }} />
                    </div>
                    <div className="progress-meta">
                      <span>
                        {item.episodesWatched || 0}/{item.totalEpisodes || "?"} episodes
                      </span>
                      <span>{item.progressPercent || 0}%</span>
                    </div>
                  </div>
                  {item.notes && <p className="notes">{item.notes}</p>}
                  <div className="dates">
                    {item.startDate && <span>Started {formatDate(item.startDate)}</span>}
                    {item.finishDate && <span>Finished {formatDate(item.finishDate)}</span>}
                    {item.totalTimeSpent ? (
                      <span>{formatMinutes(item.totalTimeSpent)} watched</span>
                    ) : null}
                  </div>
                  <div className="card-actions">
                    {item.status !== "Completed" && (
                      <button
                        className="ghost small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleQuickAdd(item);
                        }}
                      >
                        +1 Episode
                      </button>
                    )}
                    <button className="ghost small" onClick={(event) => { event.stopPropagation(); handleEdit(item); }}>
                      Edit
                    </button>
                    <button className="danger small" onClick={(event) => { event.stopPropagation(); handleDelete(item._id); }}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <EditListModal
        open={editOpen}
        item={editItem}
        listOptions={listOptions}
        error={editError}
        onClose={() => {
          if (!editSaving) {
            setEditOpen(false);
            setEditItem(null);
          }
        }}
        onSave={handleSaveEdit}
        onDelete={handleDeleteFromModal}
        saving={editSaving}
      />
      <CreateListModal
        open={createListOpen}
        items={items}
        error={createListError}
        saving={createListSaving}
        onClose={() => {
          if (!createListSaving) {
            setCreateListOpen(false);
          }
        }}
        onCreate={handleCreateList}
      />
    </section>
  );
}

export default ListPage;

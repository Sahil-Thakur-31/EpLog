import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAnimeList } from "../context/AnimeListContext.jsx";
import { useNavigate } from "react-router-dom";
import AddToListModal from "../components/AddToListModal.jsx";
import GenrePicker from "../components/GenrePicker.jsx";
import EditListModal from "../components/EditListModal.jsx";

const sections = [
  { id: "trending", title: "Trending", sort: "TRENDING_DESC" },
  { id: "favorites", title: "All-Time Favorites", sort: "FAVOURITES_DESC" },
  { id: "popular", title: "Most Popular", sort: "POPULARITY_DESC" },
  { id: "top", title: "Top Rated", sort: "SCORE_DESC" },
  { id: "recent", title: "Recently Updated", sort: "UPDATED_AT_DESC" },
];

const formatOptions = [
  { id: "TV", label: "TV" },
  { id: "TV_SHORT", label: "TV Short" },
  { id: "MOVIE", label: "Movie" },
  { id: "OVA", label: "OVA" },
  { id: "ONA", label: "ONA" },
];

const scoreFilters = [
  { id: "70", label: "70+ score" },
  { id: "80", label: "80+ score" },
  { id: "90", label: "90+ score" },
];

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

const buildSectionState = () =>
  sections.reduce((acc, section) => {
    acc[section.id] = { items: [], loading: false, error: "" };
    return acc;
  }, {});

const HOME_CACHE_KEY = "anilog_home_cache_v1";
const HOME_CACHE_TTL = 6 * 60 * 60 * 1000;

const readHomeCache = () => {
  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp) return null;
    if (Date.now() - parsed.timestamp > HOME_CACHE_TTL) return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

function HomePage() {
  const { apiFetch } = useAuth();
  const { addFromAniList, items, update, remove } = useAnimeList();
  const navigate = useNavigate();
  const [homeCache, setHomeCache] = useState(() => readHomeCache());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [modalAdding, setModalAdding] = useState(false);
  const [homeSearch, setHomeSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [homeFormats, setHomeFormats] = useState("");
  const [homeScores, setHomeScores] = useState("");
  const [homeGenres, setHomeGenres] = useState([]);
  const [homeSeasons, setHomeSeasons] = useState("");
  const [homeYears, setHomeYears] = useState("");
  const [homeReleaseStatuses, setHomeReleaseStatuses] = useState("");
  const [genreOptions, setGenreOptions] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState("");
  const [sectionData, setSectionData] = useState(buildSectionState);
  const [viewAllSectionId, setViewAllSectionId] = useState("");
  const [viewAllPage, setViewAllPage] = useState(1);
  const [viewAllData, setViewAllData] = useState({
    items: [],
    pageInfo: null,
    loading: false,
    error: "",
  });
  const [browsePage, setBrowsePage] = useState(1);
  const [browseData, setBrowseData] = useState({
    items: [],
    pageInfo: null,
    loading: false,
    error: "",
  });
  const trimmedSearch = homeSearch.trim();
  const browseActive = Boolean(
    trimmedSearch ||
      homeFormats ||
      homeScores ||
      homeGenres.length ||
      homeSeasons ||
      homeYears ||
      homeReleaseStatuses
  );

  const handleAdd = (item) => {
    setModalItem(item);
    setModalOpen(true);
  };

  const handleConfirmAdd = async (payload) => {
    if (!modalItem) return;
    try {
      setModalAdding(true);
      await addFromAniList(modalItem.id, payload);
      setModalOpen(false);
      setModalItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setModalAdding(false);
    }
  };

  const handleEditOpen = (item) => {
    setEditItem(item);
    setEditOpen(true);
    setEditError("");
  };

  const handleEditSave = async (payload) => {
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

  const handleEditDelete = async () => {
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

  const saveHomeCache = (partial) => {
    try {
      const raw = localStorage.getItem(HOME_CACHE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      const next = {
        ...current,
        ...partial,
        timestamp: Date.now(),
      };
      localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(next));
      setHomeCache(next);
    } catch (error) {
      // ignore cache errors
    }
  };

  const handleRefreshHome = useCallback(() => {
    try {
      localStorage.removeItem(HOME_CACHE_KEY);
    } catch (error) {
      // ignore cache errors
    }
    setHomeCache(null);
    setSectionData(buildSectionState());
    setGenreOptions([]);
    setGenreError("");
    setGenreLoading(false);
  }, []);

  useEffect(() => {
    const handler = () => handleRefreshHome();
    window.addEventListener("anilog:refresh-home", handler);
    return () => window.removeEventListener("anilog:refresh-home", handler);
  }, [handleRefreshHome]);

  useEffect(() => {
    if (!homeCache) return;
    if (Array.isArray(homeCache.genres)) {
      setGenreOptions(homeCache.genres);
      setGenreLoading(false);
    }
    if (homeCache.sections) {
      setSectionData((prev) => {
        const next = { ...prev };
        sections.forEach((section) => {
          const cached = homeCache.sections?.[section.id];
          if (cached) {
            next[section.id] = {
              items: cached.items || [],
              loading: false,
              error: "",
            };
          }
        });
        return next;
      });
    }
  }, [homeCache]);

  useEffect(() => {
    if (homeCache?.genres?.length) return;
    const loadGenres = async () => {
      try {
        setGenreLoading(true);
        setGenreError("");
        const response = await apiFetch("/api/anilist/genres");
        if (!response.ok) throw new Error("Failed to load genres.");
        const data = await response.json();
        const nextGenres = Array.isArray(data) ? data : [];
        setGenreOptions(nextGenres);
        saveHomeCache({ genres: nextGenres });
      } catch (err) {
        setGenreError(err.message || "Could not load genres.");
      } finally {
        setGenreLoading(false);
      }
    };

    loadGenres();
  }, [apiFetch, homeCache]);

  useEffect(() => {
    if (homeCache?.sections) return;
    let isMounted = true;
    const loadSections = async () => {
      setSectionData((prev) => {
        const next = { ...prev };
        sections.forEach((section) => {
          next[section.id] = { ...next[section.id], loading: true, error: "" };
        });
        return next;
      });

      const nextResults = {};
      for (const section of sections) {
        try {
          const response = await apiFetch(
            `/api/anilist/discover?sort=${section.sort}&perPage=30&page=1`
          );
          if (!response.ok) throw new Error("Failed to load section.");
          const data = await response.json();
          nextResults[section.id] = {
            items: data.items || [],
            error: data.unavailable ? "AniList is temporarily unavailable." : "",
          };
        } catch (err) {
          nextResults[section.id] = { items: [], error: err.message || "Section load failed." };
        }
        if (!isMounted) return;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      if (!isMounted) return;
      setSectionData((prev) => {
        const next = { ...prev };
        sections.forEach((section) => {
          const result = nextResults[section.id] || { items: [], error: "" };
          next[section.id] = {
            items: result.items,
            loading: false,
            error: result.error,
          };
        });
        return next;
      });
      const hasErrors = sections.some((section) => nextResults[section.id]?.error);
      if (!hasErrors) {
        saveHomeCache({ sections: nextResults });
      }
    };

    loadSections();
    return () => {
      isMounted = false;
    };
  }, [apiFetch, homeCache]);

  useEffect(() => {
    if (!viewAllSectionId) return;
    let isMounted = true;
    const section = sections.find((item) => item.id === viewAllSectionId);
    if (!section) return;

    const loadViewAll = async () => {
      try {
        setViewAllData((prev) => ({ ...prev, loading: true, error: "" }));
        const response = await apiFetch(
          `/api/anilist/discover?sort=${section.sort}&perPage=30&page=${viewAllPage}`
        );
        if (!response.ok) throw new Error("Failed to load category.");
        const data = await response.json();
        if (!isMounted) return;
        setViewAllData({
          items: data.items || [],
          pageInfo: data.pageInfo || null,
          loading: false,
          error: data.unavailable ? "AniList is temporarily unavailable." : "",
        });
      } catch (err) {
        if (!isMounted) return;
        setViewAllData({
          items: [],
          pageInfo: null,
          loading: false,
          error: err.message || "Could not load category.",
        });
      }
    };

    loadViewAll();
    return () => {
      isMounted = false;
    };
  }, [apiFetch, viewAllSectionId, viewAllPage]);

  useEffect(() => {
    if (!browseActive) return;
    setViewAllSectionId("");
    setViewAllPage(1);
    setBrowsePage(1);
  }, [browseActive]);

  useEffect(() => {
    if (!browseActive) return;
    let isMounted = true;
    const timeout = setTimeout(async () => {
      try {
        setBrowseData((prev) => ({ ...prev, loading: true, error: "" }));
        const params = new URLSearchParams({
          perPage: "30",
          page: String(browsePage),
        });
        let endpoint = "/api/anilist/discover";
        if (trimmedSearch) {
          endpoint = "/api/anilist/search";
          params.set("query", trimmedSearch);
        } else {
          params.set("sort", "TRENDING_DESC");
          if (homeFormats) params.set("formats", homeFormats);
          if (homeGenres.length) params.set("genres", homeGenres.join(","));
          if (homeSeasons) params.set("seasons", homeSeasons);
          if (homeYears) params.set("years", homeYears);
          if (homeReleaseStatuses) params.set("statuses", homeReleaseStatuses);
          if (homeScores) {
            params.set("minScore", String(homeScores));
          }
        }
        const response = await apiFetch(`${endpoint}?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load results.");
        const data = await response.json();
        if (!isMounted) return;
        setBrowseData({
          items: data.items || [],
          pageInfo: data.pageInfo || null,
          loading: false,
          error: data.unavailable ? "AniList is temporarily unavailable." : "",
        });
      } catch (err) {
        if (!isMounted) return;
        setBrowseData({
          items: [],
          pageInfo: null,
          loading: false,
          error: err.message || "Could not load results.",
        });
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [
    apiFetch,
    browseActive,
    browsePage,
    trimmedSearch,
    homeFormats,
    homeScores,
    homeGenres,
    homeSeasons,
    homeYears,
    homeReleaseStatuses,
  ]);

  const availableGenres = useMemo(() => {
    return [...genreOptions].sort((a, b) => a.localeCompare(b));
  }, [genreOptions]);

  const yearOptions = useMemo(() => buildYearOptions(), []);
  const listOptions = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      (item.customLists || []).forEach((entry) => set.add(entry));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);
  const listByAniListId = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (item.anilistId) {
        map.set(item.anilistId, item);
      }
    });
    return map;
  }, [items]);

  const applyFilters = (items) => {
    let list = [...items];
    if (homeFormats) {
      list = list.filter((item) => item.format === homeFormats);
    }
    if (homeScores) {
      const minScore = Number(homeScores);
      list = list.filter((item) => (item.averageScore || 0) >= minScore);
    }
    if (homeSeasons) {
      list = list.filter((item) => item.season === homeSeasons);
    }
    if (homeYears) {
      list = list.filter((item) => String(item.seasonYear || "") === homeYears);
    }
    if (homeGenres.length) {
      list = list.filter((item) =>
        homeGenres.every((genre) => (item.genres || []).includes(genre))
      );
    }
    if (homeReleaseStatuses) {
      list = list.filter((item) => item.status === homeReleaseStatuses);
    }
    return list;
  };

  const viewAllSection = sections.find((section) => section.id === viewAllSectionId);
  const viewAllFiltered = applyFilters(viewAllData.items);
  const viewAllPageInfo = viewAllData.pageInfo;
  const totalPages = viewAllPageInfo?.lastPage || 1;
  const browsePageInfo = browseData.pageInfo;
  const browseTotalPages = browsePageInfo?.lastPage || 1;
  const browseFiltered = trimmedSearch ? applyFilters(browseData.items) : browseData.items;

  return (
    <section className="page">
      <div className="page-layout">
        <aside className="sidebar">
          <h3>Filters</h3>
          <div className="filter-block">
            <label>Search</label>
            <input
              value={homeSearch}
              onChange={(event) => setHomeSearch(event.target.value)}
              placeholder="Search AniList titles"
            />
          </div>
          <div className="filter-block">
            <label>Format</label>
            <select value={homeFormats} onChange={(event) => setHomeFormats(event.target.value)}>
              <option value="">All Formats</option>
              {formatOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-block">
            <label>Score</label>
            <select value={homeScores} onChange={(event) => setHomeScores(event.target.value)}>
              <option value="">All Scores</option>
              {scoreFilters.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-block">
            <label>Release Status</label>
            <select
              value={homeReleaseStatuses}
              onChange={(event) => setHomeReleaseStatuses(event.target.value)}
            >
              <option value="">All Release Status</option>
              <option value="FINISHED">Finished</option>
              <option value="RELEASING">Releasing</option>
              <option value="NOT_YET_RELEASED">Not Yet Released</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="filter-block">
            <label>Season</label>
            <select value={homeSeasons} onChange={(event) => setHomeSeasons(event.target.value)}>
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
            <select value={homeYears} onChange={(event) => setHomeYears(event.target.value)}>
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
              {homeGenres.length > 0 && (
                <button
                  className="icon-button"
                  type="button"
                  title="Clear genres"
                  onClick={() => setHomeGenres([])}
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
                values={homeGenres}
                onChange={setHomeGenres}
                placeholder="All Genres"
              />
            )}
          </div>
        </aside>
        <div className="main-content">
          {browseActive ? (
            <div className="view-all">
              <div className="section-header">
                <div>
                  <h3>Results</h3>
                  <span className="muted">Filtered results from AniList.</span>
                </div>
                <div className="header-actions">
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      setHomeSearch("");
                      setHomeFormats("");
                      setHomeScores("");
                      setHomeGenres([]);
                      setHomeSeasons("");
                      setHomeYears("");
                      setHomeReleaseStatuses("");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
              {browseData.loading ? (
                <p className="muted">Loading results...</p>
              ) : browseData.error ? (
                <p className="error">{browseData.error}</p>
              ) : browseFiltered.length === 0 ? (
                <p className="muted">No results for these filters.</p>
              ) : (
                <div className="cards grid-cards">
                  {browseFiltered.map((item) => {
                    const listItem = listByAniListId.get(item.id);
                    const isEditing = editSaving && editItem?._id === listItem?._id;
                    const isAdding = modalAdding && modalItem?.id === item.id;
                    return (
                      <article
                        className="card card-two-col clickable"
                        key={`browse-${item.id}`}
                        onClick={() => navigate(`/anime/${item.id}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="card-left">
                          <div className="poster">
                            {item.posterUrl ? (
                              <img src={item.posterUrl} alt={item.title} />
                            ) : (
                              <div className="poster-fallback">{item.title?.slice(0, 1)}</div>
                            )}
                          </div>
                          <div className="card-popularity">
                            <span className="muted">Popularity</span>
                            <strong>{item.popularity?.toLocaleString() || "-"}</strong>
                          </div>
                        </div>
                        <div className="card-right">
                          <h3>{item.title}</h3>
                          <div className="meta compact">
                            {item.format && <span className="pill">{item.format}</span>}
                            <span className="pill">
                              {item.episodes ? `${item.episodes} eps` : "TBD"}
                            </span>
                          </div>
                          <div className="card-actions-row">
                            <div className="score score-left">
                              <span>Score</span>
                              <strong>{item.averageScore ?? "-"}</strong>
                            </div>
                            <button
                              className="primary small"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (listItem) {
                                  handleEditOpen(listItem);
                                } else {
                                  handleAdd(item);
                                }
                              }}
                              disabled={isAdding || isEditing}
                            >
                              {listItem
                                ? isEditing
                                  ? "Saving..."
                                  : "Edit"
                                : isAdding
                                ? "Adding..."
                                : "Add"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <div className="pagination">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setBrowsePage((prev) => Math.max(1, prev - 1))}
                  disabled={browsePage <= 1 || browseData.loading}
                >
                  Previous
                </button>
                <span className="muted">
                  Page {browsePage} of {browseTotalPages}
                </span>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setBrowsePage((prev) => Math.min(browseTotalPages, prev + 1))}
                  disabled={!browsePageInfo?.hasNextPage || browseData.loading}
                >
                  Next
                </button>
              </div>
            </div>
          ) : viewAllSection ? (
            <div className="view-all">
              <div className="section-header">
                <div>
                  <h3>{viewAllSection.title}</h3>
                  <span className="muted">All titles in this category.</span>
                </div>
                <div className="header-actions">
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      setViewAllSectionId("");
                      setViewAllPage(1);
                    }}
                  >
                    Back to sections
                  </button>
                </div>
              </div>
              {viewAllData.loading ? (
                <p className="muted">Loading titles...</p>
              ) : viewAllData.error ? (
                <p className="error">{viewAllData.error}</p>
              ) : viewAllFiltered.length === 0 ? (
                <p className="muted">No results for these filters.</p>
              ) : (
                <div className="cards grid-cards">
                  {viewAllFiltered.map((item) => {
                    const listItem = listByAniListId.get(item.id);
                    const isEditing = editSaving && editItem?._id === listItem?._id;
                    const isAdding = modalAdding && modalItem?.id === item.id;
                    return (
                    <article
                      className="card card-two-col clickable"
                      key={`${viewAllSection.id}-${item.id}`}
                      onClick={() => navigate(`/anime/${item.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="card-left">
                        <div className="poster">
                          {item.posterUrl ? (
                            <img src={item.posterUrl} alt={item.title} />
                          ) : (
                            <div className="poster-fallback">{item.title?.slice(0, 1)}</div>
                          )}
                        </div>
                        <div className="card-popularity">
                          <span className="muted">Popularity</span>
                          <strong>{item.popularity?.toLocaleString() || "-"}</strong>
                        </div>
                      </div>
                      <div className="card-right">
                        <h3>{item.title}</h3>
                        <div className="meta compact">
                          {item.format && <span className="pill">{item.format}</span>}
                          <span className="pill">
                            {item.episodes ? `${item.episodes} eps` : "TBD"}
                          </span>
                        </div>
                        <div className="card-actions-row">
                          <div className="score score-left">
                            <span>Score</span>
                            <strong>{item.averageScore ?? "-"}</strong>
                          </div>
                          <button
                            className="primary small"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (listItem) {
                                handleEditOpen(listItem);
                              } else {
                                handleAdd(item);
                              }
                            }}
                            disabled={isAdding || isEditing}
                          >
                            {listItem
                              ? isEditing
                                ? "Saving..."
                                : "Edit"
                              : isAdding
                              ? "Adding..."
                              : "Add"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                  })}
                </div>
              )}
              <div className="pagination">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setViewAllPage((prev) => Math.max(1, prev - 1))}
                  disabled={viewAllPage <= 1 || viewAllData.loading}
                >
                  Previous
                </button>
                <span className="muted">
                  Page {viewAllPage} of {totalPages}
                </span>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setViewAllPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={!viewAllPageInfo?.hasNextPage || viewAllData.loading}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="home-sections">
              {sections.map((section) => {
                const state = sectionData[section.id];
                const filteredItems = applyFilters(state?.items || []);
                return (
                  <div className="home-section" key={section.id}>
                    <div className="section-header">
                      <div>
                        <h3>{section.title}</h3>
                      </div>
                      <div className="header-actions">
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => {
                            setViewAllSectionId(section.id);
                            setViewAllPage(1);
                          }}
                        >
                          View all
                        </button>
                      </div>
                    </div>
                    {state?.loading ? (
                      <p className="muted">Loading {section.title.toLowerCase()}...</p>
                    ) : state?.error ? (
                      <p className="error">{state.error}</p>
                    ) : filteredItems.length === 0 ? (
                      <p className="muted">
                        {browseActive ? "No titles match the current filters." : "No titles available yet."}
                      </p>
                    ) : (
                      <div className="row-scroll">
                        {filteredItems.map((item) => {
                          const listItem = listByAniListId.get(item.id);
                          const isEditing = editSaving && editItem?._id === listItem?._id;
                          const isAdding = modalAdding && modalItem?.id === item.id;
                          return (
                          <article
                            className="card card-two-col clickable"
                            key={`${section.id}-${item.id}`}
                            onClick={() => navigate(`/anime/${item.id}`)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="card-left">
                              <div className="poster">
                                {item.posterUrl ? (
                                  <img src={item.posterUrl} alt={item.title} />
                                ) : (
                                  <div className="poster-fallback">{item.title?.slice(0, 1)}</div>
                                )}
                              </div>
                              <div className="card-popularity">
                                <span className="muted">Popularity</span>
                                <strong>{item.popularity?.toLocaleString() || "-"}</strong>
                              </div>
                            </div>
                            <div className="card-right">
                              <h3>{item.title}</h3>
                              <div className="meta compact">
                                {item.format && <span className="pill">{item.format}</span>}
                                <span className="pill">
                                  {item.episodes ? `${item.episodes} eps` : "TBD"}
                                </span>
                              </div>
                              <div className="card-actions-row">
                                <div className="score score-left">
                                  <span>Score</span>
                                  <strong>{item.averageScore ?? "-"}</strong>
                                </div>
                                <button
                                  className="primary small"
                                  type="button"
                                  onClick={(event) => {
                              event.stopPropagation();
                              if (listItem) {
                                handleEditOpen(listItem);
                              } else {
                                handleAdd(item);
                              }
                            }}
                                  disabled={isAdding || isEditing}
                                >
                                  {listItem
                                    ? isEditing
                                      ? "Saving..."
                                      : "Edit"
                                    : isAdding
                                    ? "Adding..."
                                    : "Add"}
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <AddToListModal
        open={modalOpen}
        title={modalItem?.title}
        onClose={() => {
          if (!modalAdding) {
            setModalOpen(false);
            setModalItem(null);
          }
        }}
        onConfirm={handleConfirmAdd}
      />
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
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        saving={editSaving}
      />
    </section>
  );
}

export default HomePage;

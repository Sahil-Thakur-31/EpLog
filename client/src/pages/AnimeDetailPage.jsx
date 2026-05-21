import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAnimeList } from "../context/AnimeListContext.jsx";
import AddToListModal from "../components/AddToListModal.jsx";
import EditListModal from "../components/EditListModal.jsx";

const formatDateLong = (date) => {
  if (!date || !date.year) return "-";
  const month = date.month ? date.month - 1 : 0;
  const day = date.day || 1;
  const safeDate = new Date(Date.UTC(date.year, month, day));
  return safeDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCountdown = (seconds) => {
  if (seconds === null || seconds === undefined) return "-";
  const total = Math.max(0, Number(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

const cleanDescription = (value) => {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
};

function AnimeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { addFromAniList, update, remove, items } = useAnimeList();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAdding, setModalAdding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [detail, setDetail] = useState(null);
  const [localItem, setLocalItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const isNumeric = useMemo(() => /^\d+$/.test(id || ""), [id]);

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      try {
        setLoading(true);
        setError("");
        let detailData = null;
        let listData = null;

        if (isNumeric) {
          const response = await apiFetch(`/api/anilist/details?id=${id}`);
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.message || "Failed to load anime.");
          }
          detailData = await response.json();
        } else {
          const response = await apiFetch(`/api/anime/${id}`);
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.message || "Failed to load list entry.");
          }
          listData = await response.json();
          if (listData?.anilistId) {
            const detailResponse = await apiFetch(`/api/anilist/details?id=${listData.anilistId}`);
            if (detailResponse.ok) {
              detailData = await detailResponse.json();
            }
          }
        }

        if (!isMounted) return;
        setDetail(detailData);
        setLocalItem(listData);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Could not load anime.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [apiFetch, id, isNumeric]);

  const displayTitle = detail?.title || localItem?.title || "Unknown title";
  const description = cleanDescription(detail?.description || "");
  const airingEpisode = detail?.nextAiringEpisode?.episode;
  const airingCountdown = detail?.nextAiringEpisode?.timeUntilAiring;
  const isAiring = detail?.status === "RELEASING" && airingEpisode;
  const synonyms = (detail?.synonyms || []).filter(Boolean);
  const tags = (detail?.tags || []).slice(0, 18);
  const relations = detail?.relations || [];
  const statusDistribution = detail?.stats?.statusDistribution || [];
  const scoreDistribution = detail?.stats?.scoreDistribution || [];
  const listOptions = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      (item.customLists || []).forEach((entry) => set.add(entry));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const statusOrder = ["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED"];
  const statusLabels = {
    CURRENT: "Current",
    PLANNING: "Planning",
    COMPLETED: "Completed",
    DROPPED: "Dropped",
    PAUSED: "Paused",
  };
  const statusColors = {
    COMPLETED: "#22c55e",
    PLANNING: "#38bdf8",
    CURRENT: "#8b5cf6",
    DROPPED: "#f43f5e",
    PAUSED: "#f59e0b",
  };

  const statusEntries = statusOrder
    .map((key) => {
      const match = statusDistribution.find((item) => item.status === key);
      return match ? { status: key, amount: match.amount } : null;
    })
    .filter(Boolean);

  const statusTotal = statusEntries.reduce((sum, item) => sum + (item.amount || 0), 0);

  const scoreEntries = [...scoreDistribution]
    .sort((a, b) => a.score - b.score)
    .map((item) => ({
      score: item.score,
      amount: item.amount || 0,
    }));
  const maxScoreAmount = scoreEntries.reduce((max, item) => Math.max(max, item.amount), 0) || 1;

  const handleAdd = () => {
    if (!detail?.id) return;
    setModalOpen(true);
  };

  const handleEditOpen = () => {
    if (!localItem) return;
    setEditOpen(true);
    setEditError("");
  };

  const handleConfirmAdd = async (payload) => {
    if (!detail?.id) return;
    try {
      setModalAdding(true);
      setAdding(true);
      await addFromAniList(detail.id, payload);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setModalAdding(false);
      setAdding(false);
    }
  };

  const handleSaveEdit = async (payload) => {
    if (!localItem) return;
    try {
      setEditSaving(true);
      await update(localItem._id, payload);
      setEditOpen(false);
    } catch (err) {
      setEditError(err.message || "Update failed.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteEdit = async () => {
    if (!localItem) return;
    if (!window.confirm("Delete this entry?")) return;
    try {
      setEditSaving(true);
      await remove(localItem._id);
      setLocalItem(null);
      setEditOpen(false);
    } catch (err) {
      setEditError(err.message || "Delete failed.");
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page">
        <div className="main-content detail">
          <p className="muted">Loading anime...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page">
        <div className="main-content detail">
          <p className="error">{error}</p>
          <button className="ghost" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="main-content detail">
        <div className={`detail-hero ${detail?.bannerImage ? "" : "no-banner"}`}>
          {detail?.bannerImage && (
            <div
              className="detail-banner"
              style={{ backgroundImage: `url(${detail.bannerImage})` }}
            />
          )}
          <div className="detail-hero-card">
            <div className="poster large">
              {detail?.posterUrl || localItem?.posterUrl ? (
                <img src={detail?.posterUrl || localItem?.posterUrl} alt={displayTitle} />
              ) : (
                <div className="poster-fallback">{displayTitle.slice(0, 1)}</div>
              )}
            </div>
            <div className="detail-hero-info">
              <div className="detail-title-row">
                <div>
                  <h2>{displayTitle}</h2>
                  {(detail?.titleRomaji || detail?.titleNative) && (
                    <p className="muted">
                      {detail?.titleRomaji || ""}
                      {detail?.titleNative ? ` / ${detail.titleNative}` : ""}
                    </p>
                  )}
                </div>
                <div className="detail-hero-actions">
                  {detail?.id && !localItem && (
                    <button className="primary" onClick={handleAdd} disabled={adding}>
                      {adding ? "Adding..." : "Add to My List"}
                    </button>
                  )}
                  {localItem && (
                    <button className="primary" onClick={handleEditOpen} disabled={editSaving}>
                      {editSaving ? "Saving..." : "Edit"}
                    </button>
                  )}
                </div>
              </div>
              {isAiring && (
                <div className="airing-badge">
                  <span>Now Airing</span>
                  <strong>
                    Ep {airingEpisode}: {formatCountdown(airingCountdown)}
                  </strong>
                </div>
              )}
              <div className="detail-tags">
                {detail?.format && <span className="pill">{detail.format}</span>}
                {detail?.status && <span className="pill">{detail.status}</span>}
                {detail?.season && detail?.seasonYear && (
                  <span className="pill">{detail.season} {detail.seasonYear}</span>
                )}
                {detail?.episodes && <span className="pill">{detail.episodes} eps</span>}
                {detail?.duration && <span className="pill">{detail.duration} min</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-layout">
          <aside className="detail-sidebar">
            <div className="detail-nav">
              {[
                { id: "overview", label: "Overview" },
                { id: "characters", label: "Characters" },
                { id: "staff", label: "Staff" },
                { id: "stats", label: "Stats" },
                { id: "social", label: "Social" },
                { id: "relations", label: "Relations" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`detail-nav-item ${activeSection === item.id ? "is-active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>
          <div className="detail-sections">
            {activeSection === "overview" && (
              <section className="panel detail-panel">
                <h3>Overview</h3>
                {description ? (
                  <p className="detail-description">{description}</p>
                ) : (
                  <p className="muted">No overview available.</p>
                )}
                <div className="detail-facts">
                  {isAiring && (
                    <div>
                      <span>Airing</span>
                      <strong>
                        Ep {airingEpisode}: {formatCountdown(airingCountdown)}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span>Format</span>
                    <strong>{detail?.format || "-"}</strong>
                  </div>
                  <div>
                    <span>Episodes</span>
                    <strong>{detail?.episodes ?? "-"}</strong>
                  </div>
                  <div>
                    <span>Episode Duration</span>
                    <strong>{detail?.duration ? `${detail.duration} mins` : "-"}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{detail?.status || "-"}</strong>
                  </div>
                  <div>
                    <span>Start Date</span>
                    <strong>{formatDateLong(detail?.startDate)}</strong>
                  </div>
                  <div>
                    <span>End Date</span>
                    <strong>{formatDateLong(detail?.endDate)}</strong>
                  </div>
                  <div>
                    <span>Season</span>
                    <strong>
                      {detail?.season && detail?.seasonYear
                        ? `${detail.season} ${detail.seasonYear}`
                        : "-"}
                    </strong>
                  </div>
                  <div>
                    <span>Source</span>
                    <strong>{detail?.source || "-"}</strong>
                  </div>
                  <div>
                    <span>Hashtag</span>
                    <strong>{detail?.hashtag || "-"}</strong>
                  </div>
                </div>
                <div className="detail-grid">
                  <div className="panel detail-panel">
                    <h4>Titles</h4>
                    <div className="detail-stats">
                      <div>
                        <span>Romaji</span>
                        <strong>{detail?.titleRomaji || "-"}</strong>
                      </div>
                      <div>
                        <span>English</span>
                        <strong>{detail?.titleEnglish || "-"}</strong>
                      </div>
                      <div>
                        <span>Native</span>
                        <strong>{detail?.titleNative || "-"}</strong>
                      </div>
                      <div>
                        <span>Synonyms</span>
                        <strong>{synonyms.length ? synonyms.join(", ") : "-"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="panel detail-panel">
                    <h4>Genres</h4>
                    <div className="detail-tags">
                      {(detail?.genres || []).length ? (
                        detail.genres.map((genre) => (
                          <span className="pill" key={genre}>
                            {genre}
                          </span>
                        ))
                      ) : (
                        <span className="muted">No genres listed.</span>
                      )}
                    </div>
                  </div>
                  <div className="panel detail-panel">
                    <h4>Tags</h4>
                    <div className="detail-tags">
                      {tags.length ? (
                        tags.map((tag) => (
                          <span className="pill" key={tag.name}>
                            {tag.name} {tag.rank ? `${tag.rank}%` : ""}
                          </span>
                        ))
                      ) : (
                        <span className="muted">No tags listed.</span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="ghost">Write Review</button>
              </section>
            )}

            {activeSection === "characters" && (
              <section className="panel detail-panel">
                <h3>Characters</h3>
                {detail?.characters?.length ? (
                  <div className="detail-people">
                    {detail.characters.map((character) => (
                      <div className="detail-person" key={`${character.name}-${character.role}`}>
                        <div className="person-avatar">
                          {character.image ? (
                            <img src={character.image} alt={character.name} />
                          ) : (
                            <div className="poster-fallback">{character.name?.slice(0, 1)}</div>
                          )}
                        </div>
                        <div>
                          <strong>{character.name}</strong>
                          <span className="muted">{character.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No character data available.</p>
                )}
              </section>
            )}

            {activeSection === "staff" && (
              <section className="panel detail-panel">
                <h3>Staff</h3>
                {detail?.staff?.length ? (
                  <div className="detail-people">
                    {detail.staff.map((staff) => (
                      <div className="detail-person" key={`${staff.name}-${staff.role}`}>
                        <div className="person-avatar">
                          {staff.image ? (
                            <img src={staff.image} alt={staff.name} />
                          ) : (
                            <div className="poster-fallback">{staff.name?.slice(0, 1)}</div>
                          )}
                        </div>
                        <div>
                          <strong>{staff.name}</strong>
                          <span className="muted">{staff.role || staff.occupations?.[0] || ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No staff data available.</p>
                )}
              </section>
            )}

            {activeSection === "stats" && (
              <section className="panel detail-panel">
                <h3>Stats</h3>
                <div className="detail-grid">
                  <div className="panel detail-panel">
                    <h4>Scores</h4>
                    <div className="detail-stats">
                      <div>
                        <span>Average Score</span>
                        <strong>{detail?.averageScore ? `${detail.averageScore}%` : "-"}</strong>
                      </div>
                      <div>
                        <span>Mean Score</span>
                        <strong>{detail?.meanScore ? `${detail.meanScore}%` : "-"}</strong>
                      </div>
                      <div>
                        <span>Popularity</span>
                        <strong>{detail?.popularity?.toLocaleString() || "-"}</strong>
                      </div>
                      <div>
                        <span>Favorites</span>
                        <strong>{detail?.favourites?.toLocaleString() || "-"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="panel detail-panel">
                    <h4>Studios</h4>
                    <div className="detail-tags">
                      {(detail?.studios || []).length ? (
                        detail.studios.map((studio) => (
                          <span className="pill" key={studio.name}>
                            {studio.name}
                          </span>
                        ))
                      ) : (
                        <span className="muted">No studios listed.</span>
                      )}
                    </div>
                  </div>
                  <div className="panel detail-panel">
                    <h4>Producers</h4>
                    <div className="detail-tags">
                      {(detail?.producers || []).length ? (
                        detail.producers.map((producer) => (
                          <span className="pill" key={producer.name}>
                            {producer.name}
                          </span>
                        ))
                      ) : (
                        <span className="muted">No producers listed.</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="detail-distributions">
                  <div className="distribution-card">
                    <div className="distribution-header">
                      <h4>Status Distribution</h4>
                    </div>
                    {statusEntries.length ? (
                      <>
                        <div className="status-pills">
                          {statusEntries.map((item) => (
                            <div
                              key={item.status}
                              className="status-pill"
                              style={{ background: statusColors[item.status] || "#94a3b8" }}
                            >
                              {statusLabels[item.status] || item.status}
                            </div>
                          ))}
                        </div>
                        <div className="status-values">
                          {statusEntries.map((item) => (
                            <div key={item.status} className="status-value">
                              <strong>{(item.amount || 0).toLocaleString()}</strong>
                              <span>Users</span>
                            </div>
                          ))}
                        </div>
                        <div className="status-bar">
                          {statusEntries.map((item) => (
                            <div
                              key={item.status}
                              className="status-segment"
                              style={{
                                width: `${statusTotal ? (item.amount / statusTotal) * 100 : 0}%`,
                                background: statusColors[item.status] || "#94a3b8",
                              }}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="muted">No status distribution available.</p>
                    )}
                  </div>
                  <div className="distribution-card">
                    <div className="distribution-header">
                      <h4>Score Distribution</h4>
                    </div>
                    {scoreEntries.length ? (
                      <div className="score-bars">
                        {scoreEntries.map((item) => (
                          <div key={item.score} className="score-bar">
                            <span className="score-label">{item.score}</span>
                            <div className="score-track">
                              <div
                                className="score-fill"
                                style={{
                                  height: `${(item.amount / maxScoreAmount) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="score-count">{item.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No score distribution available.</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeSection === "social" && (
              <section className="panel detail-panel">
                <h3>Social</h3>
                <div className="detail-links">
                  {detail?.siteUrl && (
                    <a className="ghost" href={detail.siteUrl} target="_blank" rel="noreferrer">
                      AniList Page
                    </a>
                  )}
                  {detail?.trailer?.site === "youtube" && detail?.trailer?.id && (
                    <a
                      className="ghost"
                      href={`https://www.youtube.com/watch?v=${detail.trailer.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Trailer
                    </a>
                  )}
                  {(detail?.externalLinks || []).map((link) => (
                    <a
                      key={link.url}
                      className="ghost"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.site}
                    </a>
                  ))}
                </div>
                {detail?.hashtag && <p className="muted">#{detail.hashtag}</p>}
              </section>
            )}

            {activeSection === "relations" && (
              <section className="panel detail-panel">
                <h3>Relations</h3>
                {relations.length ? (
                  <div className="relations-grid">
                    {relations.map((relation) => (
                      <div
                        className="relation-card clickable"
                        key={`${relation.id}-${relation.relationType}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => relation.id && navigate(`/anime/${relation.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && relation.id) {
                            navigate(`/anime/${relation.id}`);
                          }
                        }}
                      >
                        <div className="relation-image">
                          {relation.posterUrl ? (
                            <img src={relation.posterUrl} alt={relation.title} />
                          ) : (
                            <div className="poster-fallback">{relation.title?.slice(0, 1)}</div>
                          )}
                        </div>
                        <div className="relation-content">
                          <div className="relation-title">{relation.title}</div>
                          <span className="relation-tag">{relation.relationType}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No relations available.</p>
                )}
              </section>
            )}

            {activeSection === "overview" && localItem && (
              <section className="panel detail-panel">
                <h3>Your List Notes</h3>
                <div className="detail-stats">
                  <div>
                    <span>Status</span>
                    <strong>{localItem.status || "-"}</strong>
                  </div>
                  <div>
                    <span>Progress</span>
                    <strong>
                      {localItem.episodesWatched || 0}/{localItem.totalEpisodes || "?"} eps
                    </strong>
                  </div>
                  <div>
                    <span>Your Score</span>
                    <strong>{localItem.score ?? "-"}</strong>
                  </div>
                  <div>
                    <span>Priority</span>
                    <strong>{localItem.priority || "-"}</strong>
                  </div>
                </div>
                {localItem.notes && <p className="detail-description">{localItem.notes}</p>}
              </section>
            )}
          </div>
        </div>
      </div>
      <AddToListModal
        open={modalOpen}
        title={displayTitle}
        onClose={() => {
          if (!modalAdding) {
            setModalOpen(false);
          }
        }}
        onConfirm={handleConfirmAdd}
      />
      <EditListModal
        open={editOpen}
        item={localItem}
        listOptions={listOptions}
        error={editError}
        onClose={() => {
          if (!editSaving) {
            setEditOpen(false);
          }
        }}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEdit}
        saving={editSaving}
      />
    </section>
  );
}

export default AnimeDetailPage;

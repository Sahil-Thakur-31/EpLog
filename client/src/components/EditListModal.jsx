import React, { useEffect, useMemo, useState } from "react";
import MultiSelect from "./MultiSelect.jsx";

const statusOptions = [
  { id: "Watching", label: "Watching" },
  { id: "Completed", label: "Completed" },
  { id: "Planned", label: "Planned" },
  { id: "Dropped", label: "Dropped" },
];

const priorityOptions = [
  { id: "High", label: "High" },
  { id: "Medium", label: "Medium" },
  { id: "Low", label: "Low" },
];

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

function EditListModal({
  open,
  item,
  listOptions = [],
  onClose,
  onSave,
  onDelete,
  saving,
  error,
}) {
  const [status, setStatus] = useState("Planned");
  const [score, setScore] = useState(0);
  const [priority, setPriority] = useState("Medium");
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [rewatches, setRewatches] = useState(0);
  const [notes, setNotes] = useState("");
  const [customLists, setCustomLists] = useState([]);
  const [newList, setNewList] = useState("");
  const totalEpisodes = item?.totalEpisodes || 0;

  useEffect(() => {
    if (!item) return;
    setStatus(item.status || "Planned");
    setScore(item.score ?? 0);
    setPriority(item.priority || "Medium");
    setEpisodesWatched(item.episodesWatched ?? 0);
    setStartDate(toDateInput(item.startDate));
    setFinishDate(toDateInput(item.finishDate));
    setRewatches(item.rewatches ?? 0);
    setNotes(item.notes || "");
    setCustomLists(Array.isArray(item.customLists) ? item.customLists : []);
    setNewList("");
  }, [item, open]);

  const availableListOptions = useMemo(() => {
    const set = new Set([...(listOptions || []), ...(customLists || [])]);
    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ id: name, label: name }));
  }, [listOptions, customLists]);

  if (!open || !item) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    let nextEpisodes = episodesWatched;
    if (status === "Completed") {
      const total = item?.totalEpisodes ?? null;
      if (Number.isFinite(total) && total > 0) {
        nextEpisodes = total;
      }
    }
    if (status === "Planned") {
      nextEpisodes = 0;
    }
    const total = item?.totalEpisodes ?? 0;
    let nextStatus = status;
    if (total > 0 && nextEpisodes >= total) {
      nextStatus = "Completed";
    }
    onSave({
      status: nextStatus,
      score,
      priority,
      episodesWatched: nextEpisodes,
      startDate: nextStatus === "Planned" ? undefined : startDate || undefined,
      finishDate: nextStatus === "Completed" ? finishDate || undefined : undefined,
      rewatches,
      notes,
      customLists,
    });
  };

  const handleAddList = () => {
    const value = newList.trim();
    if (!value) return;
    setCustomLists((prev) => Array.from(new Set([...prev, value])));
    setNewList("");
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Entry</h3>
          <button className="ghost" type="button" onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <div className="form-row">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Score</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
            </div>
            <div className="form-row">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {priorityOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {(status === "Watching" || status === "Dropped") && (
              <div className="form-row">
                <label>Episode Progress</label>
                <input
                  type="number"
                  min="0"
                  max={totalEpisodes > 0 ? totalEpisodes : undefined}
                  value={episodesWatched}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    if (Number.isNaN(raw)) {
                      setEpisodesWatched(0);
                      return;
                    }
                    const clamped = totalEpisodes > 0 ? Math.min(raw, totalEpisodes) : raw;
                    setEpisodesWatched(Math.max(0, clamped));
                  }}
                />
              </div>
            )}
            <div className="form-row">
              <label>Total Rewatches</label>
              <input
                type="number"
                min="0"
                value={rewatches}
                onChange={(e) => setRewatches(Number(e.target.value))}
              />
            </div>
            {status !== "Planned" && (
              <div className="form-row">
                <label>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            )}
            {status === "Completed" && (
              <div className="form-row">
                <label>Finish Date</label>
                <input
                  type="date"
                  value={finishDate}
                  onChange={(e) => setFinishDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="modal-section">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="modal-section">
            <label>Custom Lists</label>
            <div className="list-inline">
              <div className="list-select">
                {availableListOptions.length ? (
                  <MultiSelect
                    options={availableListOptions}
                    values={customLists}
                    onChange={setCustomLists}
                    placeholder="Select lists"
                  />
                ) : (
                  <p className="muted">No custom anime lists</p>
                )}
              </div>
              <div className="list-create">
                <input
                  type="text"
                  value={newList}
                  placeholder="New list"
                  onChange={(e) => setNewList(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddList();
                    }
                  }}
                />
                <button className="ghost" type="button" onClick={handleAddList} aria-label="Add list">
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="danger"
              type="button"
              onClick={onDelete}
              disabled={saving}
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditListModal;

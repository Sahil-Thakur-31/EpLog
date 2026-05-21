import React, { useEffect, useState } from "react";

const statusOptions = ["Planned", "Watching", "Completed"];

function AddToListModal({ open, title, onClose, onConfirm }) {
  const [status, setStatus] = useState("Planned");
  const [episodesWatched, setEpisodesWatched] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStatus("Planned");
    setEpisodesWatched(0);
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = { status };
    if (status === "Watching") {
      payload.episodesWatched = Math.max(0, Number(episodesWatched) || 0);
    }
    onConfirm(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to My List</h3>
          <button className="icon-button" type="button" onClick={onClose}>
            x
          </button>
        </div>
        {title && <p className="muted">{title}</p>}
        <form className="modal-body" onSubmit={handleSubmit}>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {status === "Watching" && (
            <label>
              Episodes watched
              <input
                type="number"
                min="0"
                value={episodesWatched}
                onChange={(event) => setEpisodesWatched(event.target.value)}
              />
            </label>
          )}
          <div className="modal-actions">
            <button className="ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" type="submit">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddToListModal;

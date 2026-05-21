import React, { useEffect, useMemo, useState } from "react";
import MultiSelect from "./MultiSelect.jsx";

function CreateListModal({ open, items = [], onClose, onCreate, saving, error }) {
  const [listName, setListName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setListName("");
    setSelectedIds([]);
    setSearch("");
  }, [open]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const title = item.title?.toLowerCase() || "";
      const alt = item.anilistTitle?.toLowerCase() || "";
      return title.includes(needle) || alt.includes(needle);
    });
  }, [items, search]);

  const options = useMemo(
    () =>
      filteredItems.map((item) => ({
        id: item._id,
        label: item.title || item.anilistTitle || "Untitled",
      })),
    [filteredItems]
  );

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = listName.trim();
    if (!name) return;
    onCreate(name, selectedIds);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create List</h3>
          <button className="ghost" type="button" onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <div className="form-row">
              <label>List Name</label>
              <input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g. Favorites"
              />
            </div>
            <div className="form-row">
              <label>Search My List</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to filter titles"
              />
            </div>
          </div>

          <div className="modal-section">
            <label>Choose Anime (optional)</label>
            {options.length ? (
              <MultiSelect
                options={options}
                values={selectedIds}
                onChange={setSelectedIds}
                placeholder="Select anime"
              />
            ) : (
              <p className="muted">No titles match that search.</p>
            )}
          </div>

          <div className="modal-footer">
            <button className="primary" type="submit" disabled={saving || !listName.trim()}>
              {saving ? "Saving..." : "Create List"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateListModal;

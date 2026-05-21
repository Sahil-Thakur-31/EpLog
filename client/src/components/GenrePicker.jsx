import React, { useEffect, useMemo, useRef, useState } from "react";

function GenrePicker({ options = [], values = [], onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 260 });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.right + 12,
        width: 260,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const summary = useMemo(() => {
    if (!values.length) return placeholder;
    if (values.length <= 2) return values.join(", ");
    return `${values.length} selected`;
  }, [values, placeholder]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, search]);

  const toggleOption = (id) => {
    if (values.includes(id)) {
      onChange(values.filter((item) => item !== id));
    } else {
      onChange([...values, id]);
    }
  };

  return (
    <div className="genre-picker" ref={ref}>
      <button
        className="genre-picker-button"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={values.length ? "" : "muted"}>{summary}</span>
        <span className="chevron">v</span>
      </button>
      {open && (
        <div
          className="genre-modal"
          role="dialog"
          aria-label="Select genres"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="genre-modal-header">
            <strong>Genres</strong>
            <button className="ghost small" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <input
            className="genre-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search genres"
          />
          <div className="genre-options">
            {filtered.length ? (
              filtered.map((option) => (
                <label className="genre-option" key={option.id}>
                  <input
                    type="checkbox"
                    checked={values.includes(option.id)}
                    onChange={() => toggleOption(option.id)}
                  />
                  {option.label}
                </label>
              ))
            ) : (
              <span className="muted">No genres found.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GenrePicker;

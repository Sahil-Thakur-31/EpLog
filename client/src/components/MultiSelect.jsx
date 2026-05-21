import React, { useEffect, useMemo, useRef, useState } from "react";

function MultiSelect({ options, values, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
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

  const selectedLabels = useMemo(() => {
    const lookup = new Map(options.map((opt) => [opt.id, opt.label]));
    return values.map((val) => lookup.get(val)).filter(Boolean);
  }, [options, values]);

  const summary = useMemo(() => {
    if (!selectedLabels.length) return placeholder;
    if (selectedLabels.length <= 2) return selectedLabels.join(", ");
    return `${selectedLabels.length} selected`;
  }, [selectedLabels, placeholder]);

  const toggleOption = (id) => {
    if (values.includes(id)) {
      onChange(values.filter((item) => item !== id));
    } else {
      onChange([...values, id]);
    }
  };

  return (
    <div className="multi-select" ref={ref}>
      <button className="multi-select-button" type="button" onClick={() => setOpen((prev) => !prev)}>
        <span className={selectedLabels.length ? "" : "muted"}>{summary}</span>
        <span className="chevron">v</span>
      </button>
      {open && (
        <div className="multi-select-menu">
          {options.map((option) => (
            <label className="multi-select-option" key={option.id}>
              <input
                type="checkbox"
                checked={values.includes(option.id)}
                onChange={() => toggleOption(option.id)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;

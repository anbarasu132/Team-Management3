import { useMemo, useState } from 'react';

export default function SearchableSelect({
  label,
  placeholder = 'Search...',
  options = [],
  value,
  onChange,
  disabled = false
}) {
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 30);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 30);
  }, [options, query]);

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border p-2 text-sm"
        placeholder={placeholder}
      />
      <div className="max-h-40 overflow-auto rounded border bg-white text-sm">
        {filtered.length === 0 && <p className="p-2 text-slate-500">No matching results.</p>}
        {filtered.map((option) => {
          const active = String(option.value) === String(value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(String(option.value))}
              className={`block w-full px-2 py-1 text-left ${
                active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-xs text-slate-500">
          Selected: <span className="font-medium text-slate-700">{selected.label}</span>
        </p>
      )}
    </div>
  );
}

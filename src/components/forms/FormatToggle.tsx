interface FormatToggleProps {
  value: 'landscape' | 'portrait';
  onChange: (v: 'landscape' | 'portrait') => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function FormatToggle({ value, onChange, disabled = false, size = 'md' }: FormatToggleProps) {
  const btnCls = size === 'sm'
    ? 'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors disabled:opacity-40'
    : 'px-4 py-2 rounded-md font-medium capitalize transition-colors disabled:opacity-40';

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
      {(['landscape', 'portrait'] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={`${btnCls} ${
            value === opt ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

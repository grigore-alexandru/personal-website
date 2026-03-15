export interface ProjectOption {
  id: string;
  title: string;
  typeName: string;
}

interface ProjectSelectorProps {
  value: string | null;
  projects: ProjectOption[];
  onChange: (projectId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ProjectSelector({
  value,
  projects,
  onChange,
  disabled = false,
  placeholder = 'None / Unassigned',
}: ProjectSelectorProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50 disabled:text-gray-400 text-sm"
    >
      <option value="">{placeholder}</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title} ({p.typeName})
        </option>
      ))}
    </select>
  );
}

import { SubtitleBlock } from '../../types';

interface SubtitleBlockEditorProps {
  block: SubtitleBlock;
  onChange: (block: SubtitleBlock) => void;
}

export function SubtitleBlockEditor({ block, onChange }: SubtitleBlockEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Subtitle
        </span>
      </div>
      <input
        type="text"
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="Enter subtitle text..."
        className="w-full px-4 py-3 text-xl font-semibold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
      />
    </div>
  );
}

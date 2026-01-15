import { useEffect, useRef } from 'react';
import { BodyBlock } from '../../types';

interface BodyTextBlockEditorProps {
  block: BodyBlock;
  onChange: (block: BodyBlock) => void;
}

export function BodyTextBlockEditor({ block, onChange }: BodyTextBlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [block.content]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Body Text
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="Enter body text..."
        rows={4}
        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
      />
    </div>
  );
}

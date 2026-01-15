import { useState, useRef, useEffect } from 'react';
import { Bold, Italic } from 'lucide-react';

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotesEditor({ value, onChange }: NotesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const formatted = value
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    setPreview(formatted || '<span class="text-neutral-400">Preview will appear here...</span>');
  }, [value]);

  const wrapSelectedText = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) return;

    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    let newText: string;
    let newCursorPos: number;

    if (wrapper === 'bold') {
      newText = beforeText + '**' + selectedText + '**' + afterText;
      newCursorPos = end + 4;
    } else {
      newText = beforeText + '*' + selectedText + '*' + afterText;
      newCursorPos = end + 2;
    }

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      wrapSelectedText('bold');
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      wrapSelectedText('italic');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">
            Notes Content
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => wrapSelectedText('bold')}
              className="p-2 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors"
              title="Bold (Cmd/Ctrl+B)"
            >
              <Bold size={18} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelectedText('italic')}
              className="p-2 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors"
              title="Italic (Cmd/Ctrl+I)"
            >
              <Italic size={18} />
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter notes content... Use **text** for bold and *text* for italic"
          rows={8}
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-y font-mono text-sm"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Tip: Select text and click formatting buttons, or use Cmd/Ctrl+B for bold, Cmd/Ctrl+I for italic
          </p>
          <p className="text-xs text-neutral-600 font-medium">
            {value.length} characters
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Live Preview
        </label>
        <div
          className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg min-h-[100px]"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </div>
    </div>
  );
}

import { ListBlock } from '../../types';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ListBlockEditorProps {
  block: ListBlock;
  onChange: (block: ListBlock) => void;
}

export function ListBlockEditor({ block, onChange }: ListBlockEditorProps) {
  const handleItemChange = (index: number, value: string) => {
    const newItems = [...block.items];
    newItems[index] = value;
    onChange({ ...block, items: newItems });
  };

  const handleAddItem = () => {
    onChange({ ...block, items: [...block.items, ''] });
  };

  const handleRemoveItem = (index: number) => {
    if (block.items.length === 1) {
      return;
    }
    const newItems = block.items.filter((_, i) => i !== index);
    onChange({ ...block, items: newItems });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...block.items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange({ ...block, items: newItems });
  };

  const handleMoveDown = (index: number) => {
    if (index === block.items.length - 1) return;
    const newItems = [...block.items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange({ ...block, items: newItems });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          List
        </span>
      </div>
      <div className="space-y-2">
        {block.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-3">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Move up"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === block.items.length - 1}
                className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Move down"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            <input
              type="text"
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              placeholder={`Item ${index + 1}...`}
              className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => handleRemoveItem(index)}
              disabled={block.items.length === 1}
              className="p-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Remove item"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddItem}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-lg transition-colors"
      >
        <Plus size={16} />
        Add Item
      </button>
    </div>
  );
}

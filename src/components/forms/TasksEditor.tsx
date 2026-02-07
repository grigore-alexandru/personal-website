import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface TasksEditorProps {
  tasks: string[];
  onChange: (tasks: string[]) => void;
}

export function TasksEditor({ tasks, onChange }: TasksEditorProps) {
  const handleAdd = () => {
    onChange([...tasks, '']);
  };

  const handleRemove = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, value: string) => {
    onChange(tasks.map((t, i) => (i === index ? value : t)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
    onChange(newTasks);
  };

  const handleMoveDown = (index: number) => {
    if (index === tasks.length - 1) return;
    const newTasks = [...tasks];
    [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
    onChange(newTasks);
  };

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
              className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleMoveDown(index)}
              disabled={index === tasks.length - 1}
              className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <span className="text-neutral-400 text-sm w-4 text-center flex-shrink-0">
            {index + 1}
          </span>
          <input
            type="text"
            value={task}
            onChange={(e) => handleUpdate(index, e.target.value)}
            placeholder="Describe a task or deliverable..."
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="flex-shrink-0 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-lg transition-colors"
      >
        <Plus size={16} />
        Add Task
      </button>

      {tasks.length === 0 && (
        <p className="text-sm text-neutral-400">No tasks added yet.</p>
      )}
    </div>
  );
}

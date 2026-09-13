import { useState } from 'react';
import { Plus, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import type { GraphFunction } from '../types';

type Props = {
  functions: GraphFunction[];
  onAdd: (expr: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onClear: () => void;
  activeFuncId: string | null;
  onSelectActive: (id: string) => void;
};

export function FunctionList(props: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      props.onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. sin(x) * x"
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
          spellCheck={false}
        />
        <button
          type="submit"
          className="bg-sky-500 hover:bg-sky-400 text-white rounded-lg px-3 py-2 transition-colors flex items-center gap-1 text-sm font-medium"
        >
          <Plus size={16} />
        </button>
      </form>

      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
        {props.functions.map((f) => (
          <div
            key={f.id}
            className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors cursor-pointer ${
              props.activeFuncId === f.id
                ? 'bg-slate-700/60 ring-1 ring-sky-500/50'
                : 'bg-slate-800/40 hover:bg-slate-800/70'
            }`}
            onClick={() => props.onSelectActive(f.id)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); props.onToggle(f.id); }}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              {f.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: f.color.stroke, boxShadow: `0 0 6px ${f.color.glow}` }}
            />
            <span className="flex-1 text-sm font-mono text-slate-200 truncate">
              {f.expression}
            </span>
            {f.error && (
              <AlertCircle size={14} className="text-rose-400 shrink-0" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); props.onRemove(f.id); }}
              className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {props.functions.length > 0 && (
        <button
          onClick={props.onClear}
          className="text-xs text-slate-500 hover:text-rose-400 transition-colors text-left"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

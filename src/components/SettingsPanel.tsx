import { Grid3x3, Type, Map, BarChart3, Route } from 'lucide-react';

type Props = {
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxisValues: boolean;
  onToggleAxisValues: () => void;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  showAudioBars: boolean;
  onToggleAudioBars: () => void;
  showTracePath: boolean;
  onToggleTracePath: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
};

export function SettingsPanel(props: Props) {
  const items = [
    { icon: Grid3x3, label: 'Grid', on: props.showGrid, toggle: props.onToggleGrid },
    { icon: Type, label: 'Axis Labels', on: props.showAxisValues, toggle: props.onToggleAxisValues },
    { icon: Map, label: 'Mini-Map', on: props.showMiniMap, toggle: props.onToggleMiniMap },
    { icon: BarChart3, label: 'Audio Bars', on: props.showAudioBars, toggle: props.onToggleAudioBars },
    { icon: Route, label: 'Trace Path', on: props.showTracePath, toggle: props.onToggleTracePath },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.toggle}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            item.on
              ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
              : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/70'
          }`}
        >
          <item.icon size={15} />
          <span>{item.label}</span>
          <div className={`ml-auto w-8 h-4 rounded-full transition-colors relative ${item.on ? 'bg-sky-500' : 'bg-slate-600'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${item.on ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>
      ))}
    </div>
  );
}

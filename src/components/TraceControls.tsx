import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Gauge } from 'lucide-react';

type Props = {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStep: (dir: -1 | 1) => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  traceX: number | null;
  traceValues: { label: string; y: number; color: string }[];
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function TraceControls(props: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => props.onStep(-1)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 transition-colors"
          title="Step backward"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={props.onPlayPause}
          className="bg-sky-500 hover:bg-sky-400 text-white rounded-lg p-2.5 transition-colors flex-1 flex items-center justify-center gap-2 font-medium text-sm"
        >
          {props.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          {props.isPlaying ? 'Pause' : 'Play Trace'}
        </button>
        <button
          onClick={() => props.onStep(1)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 transition-colors"
          title="Step forward"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Gauge size={15} className="text-slate-500 shrink-0" />
        <input
          type="range"
          min={0.1}
          max={4}
          step={0.1}
          value={props.speed}
          onChange={(e) => props.onSpeedChange(parseFloat(e.target.value))}
          className="flex-1 accent-sky-500"
        />
        <span className="text-xs text-slate-400 font-mono w-10 text-right">{props.speed.toFixed(1)}x</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={props.onToggleMute}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          {props.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <span className="text-xs text-slate-500">Audio sonification</span>
      </div>

      {props.traceX !== null && props.traceValues.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-3 flex flex-col gap-1.5">
          <div className="text-xs text-slate-500 font-mono">x = {props.traceX.toFixed(4)}</div>
          {props.traceValues.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-mono">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
              <span className="text-slate-400">{v.label} =</span>
              <span className="text-slate-100 font-medium">{isFinite(v.y) ? v.y.toFixed(4) : 'undefined'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={props.onZoomIn}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-1.5 text-xs transition-colors"
        >
          Zoom In
        </button>
        <button
          onClick={props.onZoomOut}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-1.5 text-xs transition-colors"
        >
          Zoom Out
        </button>
        <button
          onClick={props.onResetView}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-1.5 text-xs transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

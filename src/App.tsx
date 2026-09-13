import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Calculator, Settings, Trash2, BookOpen } from 'lucide-react';
import { GraphCanvas } from './components/GraphCanvas';
import { FunctionList } from './components/FunctionList';
import { TraceControls } from './components/TraceControls';
import { SettingsPanel } from './components/SettingsPanel';
import { AudioEngine } from './engine/audio';
import { tryCompile, type CompiledFunction } from './engine/evaluator';
import { getColor } from './engine/colors';
import type { GraphFunction, Viewport } from './types';
import type { RenderedFunction, Ripple } from './engine/renderer';

const DEFAULT_VIEWPORT: Viewport = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
const FULL_VIEWPORT: Viewport = { xMin: -20, xMax: 20, yMin: -12, yMax: 12 };

const PRESETS = [
  { label: 'sin(x)', expr: 'sin(x)' },
  { label: 'x²', expr: 'x^2' },
  { label: 'x³ − 3x', expr: 'x^3 - 3*x' },
  { label: '1/x', expr: '1/x' },
  { label: 'eˣ', expr: 'exp(x)' },
  { label: 'ln(x)', expr: 'ln(x)' },
  { label: 'tan(x)', expr: 'tan(x)' },
  { label: 'sin(x)/x', expr: 'sin(x)/x' },
  { label: '√x', expr: 'sqrt(x)' },
  { label: '|x|', expr: 'abs(x)' },
];

let idCounter = 0;
const genId = () => `fn_${idCounter++}`;

type CompiledFunc = { id: string; fn: CompiledFunction | null; expr: string; color: GraphFunction['color']; error: string | null };

export default function App() {
  const [functions, setFunctions] = useState<GraphFunction[]>([
    { id: genId(), expression: 'sin(x)', color: getColor(0), visible: true, error: null },
  ]);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [activeFuncId, setActiveFuncId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [traceX, setTraceX] = useState<number | null>(null);
  const [hoverWorld, setHoverWorld] = useState<{ x: number; y: number } | null>(null);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [audioBars, setAudioBars] = useState<number[]>(new Array(48).fill(0));
  const [tracePath, setTracePath] = useState<{ x: number; y: number; color: string }[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxisValues, setShowAxisValues] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showAudioBars, setShowAudioBars] = useState(true);
  const [showTracePath, setShowTracePath] = useState(true);
  const [darkMode] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'functions' | 'settings' | 'help'>('functions');

  const audioRef = useRef(new AudioEngine());
  const traceDirRef = useRef<1 | -1>(1);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const tracePathRef = useRef<{ x: number; y: number; color: string }[]>([]);

  const compiled = useMemo<CompiledFunc[]>(() => {
    return functions.map((f) => {
      const { fn, error } = tryCompile(f.expression);
      return { id: f.id, fn, expr: f.expression, color: f.color, error };
    });
  }, [functions]);

  const activeFunc = useMemo(() => {
    if (activeFuncId) return compiled.find((c) => c.id === activeFuncId) ?? null;
    return compiled.find((c) => c.fn !== null && functions.find((f) => f.id === c.id)?.visible) ?? null;
  }, [compiled, activeFuncId, functions]);

  const renderedFunctions: RenderedFunction[] = useMemo(() => {
    return compiled
      .filter((c) => c.fn !== null && functions.find((f) => f.id === c.id)?.visible)
      .map((c) => ({ fn: c.fn!, color: c.color.stroke, glow: c.color.glow }));
  }, [compiled, functions]);

  const tracePoints = useMemo(() => {
    if (traceX === null) return [];
    return compiled
      .filter((c) => c.fn !== null && functions.find((f) => f.id === c.id)?.visible)
      .map((c) => {
        let y = NaN;
        try { y = c.fn!(traceX); } catch { y = NaN; }
        return { x: traceX, y, color: c.color.stroke };
      })
      .filter((p) => isFinite(p.y));
  }, [traceX, compiled, functions]);

  const traceValues = useMemo(() => {
    if (traceX === null) return [];
    return compiled
      .filter((c) => c.fn !== null && functions.find((f) => f.id === c.id)?.visible)
      .map((c) => {
        let y = NaN;
        try { y = c.fn!(traceX); } catch { y = NaN; }
        return { label: `f`, y, color: c.color.stroke };
      });
  }, [traceX, compiled, functions]);

  const addFunction = useCallback((expr: string) => {
    const color = getColor(functions.length);
    const newFn: GraphFunction = { id: genId(), expression: expr, color, visible: true, error: null };
    setFunctions((prev) => [...prev, newFn]);
  }, [functions.length]);

  const removeFunction = useCallback((id: string) => {
    setFunctions((prev) => prev.filter((f) => f.id !== id));
    if (activeFuncId === id) setActiveFuncId(null);
  }, [activeFuncId]);

  const toggleFunction = useCallback((id: string) => {
    setFunctions((prev) => prev.map((f) => f.id === id ? { ...f, visible: !f.visible } : f));
  }, []);

  const clearAll = useCallback(() => {
    setFunctions([]);
    setActiveFuncId(null);
    setTraceX(null);
    setIsPlaying(false);
    audioRef.current.stop();
    setTracePath([]);
    tracePathRef.current = [];
  }, []);

  const handleTraceClick = useCallback((worldX: number) => {
    setTraceX(worldX);
    if (!isPlaying) {
      const af = activeFunc;
      if (af && af.fn) {
        let y = NaN;
        try { y = af.fn(worldX); } catch { y = NaN; }
        if (isFinite(y)) {
          setRipples((prev) => [...prev, { x: worldX, y, color: af.color.stroke, age: 0 }]);
          if (!muted) {
            audioRef.current.start();
            audioRef.current.update(y, viewport.yMin, viewport.yMax);
            setTimeout(() => audioRef.current.silence(), 200);
          }
        }
      }
    }
  }, [activeFunc, isPlaying, muted, viewport]);

  const handlePlayPause = useCallback(() => {
    if (!activeFunc || !activeFunc.fn) return;
    if (isPlaying) {
      setIsPlaying(false);
      audioRef.current.stop();
    } else {
      setIsPlaying(true);
      if (traceX === null) setTraceX(viewport.xMin);
      tracePathRef.current = [];
      setTracePath([]);
      if (!muted) audioRef.current.start();
    }
  }, [activeFunc, isPlaying, traceX, viewport.xMin, muted]);

  const handleStep = useCallback((dir: -1 | 1) => {
    if (!activeFunc || !activeFunc.fn) return;
    const step = 0.1 * (viewport.xMax - viewport.xMin) / 20;
    const newX = (traceX ?? 0) + dir * step;
    setTraceX(newX);
    let y = NaN;
    try { y = activeFunc.fn(newX); } catch { y = NaN; }
    if (isFinite(y) && !muted) {
      audioRef.current.start();
      audioRef.current.update(y, viewport.yMin, viewport.yMax);
      setTimeout(() => audioRef.current.silence(), 150);
    }
  }, [activeFunc, traceX, viewport, muted]);

  const zoomBy = useCallback((factor: number) => {
    const cx = (viewport.xMin + viewport.xMax) / 2;
    const cy = (viewport.yMin + viewport.yMax) / 2;
    setViewport({
      xMin: cx - (cx - viewport.xMin) * factor,
      xMax: cx + (viewport.xMax - cx) * factor,
      yMin: cy - (cy - viewport.yMin) * factor,
      yMax: cy + (viewport.yMax - cy) * factor,
    });
  }, [viewport]);

  const resetView = useCallback(() => setViewport(DEFAULT_VIEWPORT), []);

  // Animation loop
  useEffect(() => {
    const loop = (time: number) => {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;

      setPulsePhase((p) => p + dt * 4);

      if (animProgress < 1) {
        setAnimProgress((p) => Math.min(1, p + dt * 1.5));
      }

      // Update ripples
      setRipples((prev) => prev
        .map((r) => ({ ...r, age: r.age + dt * 1.5 }))
        .filter((r) => r.age < 1.5)
      );

      // Audio bars decay
      setAudioBars((prev) => prev.map((b) => b * 0.92));

      if (isPlaying && activeFunc && activeFunc.fn && traceX !== null) {
        const step = (viewport.xMax - viewport.xMin) / 200 * speed * dt * 60;
        let newX = traceX + traceDirRef.current * step;

        if (newX >= viewport.xMax) {
          newX = viewport.xMax;
          traceDirRef.current = -1;
        } else if (newX <= viewport.xMin) {
          newX = viewport.xMin;
          traceDirRef.current = 1;
        }

        setTraceX(newX);

        let y = NaN;
        try { y = activeFunc.fn(newX); } catch { y = NaN; }

        if (isFinite(y)) {
          if (!muted) {
            audioRef.current.update(y, viewport.yMin, viewport.yMax);
          }

          // Add to trace path
          const newPoint = { x: newX, y, color: activeFunc.color.stroke };
          tracePathRef.current = [...tracePathRef.current.slice(-200), newPoint];
          setTracePath(tracePathRef.current);

          // Audio bars
          const normalized = (y - viewport.yMin) / (viewport.yMax - viewport.yMin);
          const barIdx = Math.floor(Math.abs(Math.sin(time * 0.003)) * 48);
          setAudioBars((prev) => {
            const next = [...prev];
            next[barIdx] = Math.min(1, Math.abs(normalized) * 0.8 + 0.2);
            return next;
          });

          // Ripples at zero crossings
          if (tracePathRef.current.length >= 2) {
            const prev = tracePathRef.current[tracePathRef.current.length - 2];
            if (Math.sign(prev.y) !== Math.sign(y) && Math.abs(y) < viewport.yMax) {
              setRipples((prev2) => [...prev2, { x: newX, y: 0, color: activeFunc.color.stroke, age: 0 }]);
            }
          }
        } else {
          if (!muted) audioRef.current.silence();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, activeFunc, traceX, speed, viewport, muted, animProgress]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => audioRef.current.stop();
  }, []);

  const sidebarContent = useMemo(() => {
    if (sidebarTab === 'functions') {
      return (
        <>
          <FunctionList
            functions={functions}
            onAdd={addFunction}
            onRemove={removeFunction}
            onToggle={toggleFunction}
            onClear={clearAll}
            activeFuncId={activeFuncId}
            onSelectActive={setActiveFuncId}
          />
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-500 mb-2 font-medium">Quick Add</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => addFunction(p.expr)}
                  className="bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-md px-2.5 py-1 text-xs font-mono transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800">
            <TraceControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onStep={handleStep}
              speed={speed}
              onSpeedChange={setSpeed}
              muted={muted}
              onToggleMute={() => {
                setMuted((m) => {
                  if (!m) audioRef.current.stop();
                  return !m;
                });
              }}
              traceX={traceX}
              traceValues={traceValues}
              onResetView={resetView}
              onZoomIn={() => zoomBy(0.7)}
              onZoomOut={() => zoomBy(1.4)}
            />
          </div>
        </>
      );
    }
    if (sidebarTab === 'settings') {
      return (
        <SettingsPanel
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((v) => !v)}
          showAxisValues={showAxisValues}
          onToggleAxisValues={() => setShowAxisValues((v) => !v)}
          showMiniMap={showMiniMap}
          onToggleMiniMap={() => setShowMiniMap((v) => !v)}
          showAudioBars={showAudioBars}
          onToggleAudioBars={() => setShowAudioBars((v) => !v)}
          showTracePath={showTracePath}
          onToggleTracePath={() => setShowTracePath((v) => !v)}
          darkMode={darkMode}
          onToggleDarkMode={() => {}}
        />
      );
    }
    return <HelpPanel />;
  }, [sidebarTab, functions, isPlaying, speed, muted, traceX, traceValues, showGrid, showAxisValues, showMiniMap, showAudioBars, showTracePath, darkMode, activeFuncId]);

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 shrink-0 bg-slate-900/95 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Calculator size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Zenith Math</h1>
              <p className="text-xs text-slate-500">Graphing Calculator</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-2 pt-2">
          {([
            { id: 'functions', icon: Calculator, label: 'Functions' },
            { id: 'settings', icon: Settings, label: 'Settings' },
            { id: 'help', icon: BookOpen, label: 'Help' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                sidebarTab === tab.id
                  ? 'text-sky-300 border-b-2 border-sky-500'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {sidebarContent}
        </div>
      </aside>

      {/* Graph area */}
      <main className="flex-1 relative">
        <GraphCanvas
          viewport={viewport}
          functions={renderedFunctions}
          traceX={traceX}
          tracePoints={tracePoints}
          hoverWorld={hoverWorld}
          animProgress={animProgress}
          showGrid={showGrid}
          showAxisValues={showAxisValues}
          darkMode={darkMode}
          pulsePhase={pulsePhase}
          isPlaying={isPlaying}
          ripples={ripples}
          showMiniMap={showMiniMap}
          miniViewport={FULL_VIEWPORT}
          showAudioBars={showAudioBars}
          audioBars={audioBars}
          showTracePath={showTracePath}
          tracePath={tracePath}
          onHover={setHoverWorld}
          onViewportChange={setViewport}
          onTraceClick={handleTraceClick}
        />

        {/* Hover coordinate readout */}
        {hoverWorld && !isPlaying && (
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 pointer-events-none border border-slate-800">
            ({hoverWorld.x.toFixed(3)}, {hoverWorld.y.toFixed(3)})
          </div>
        )}

        {/* Status bar */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>Zoom: {((viewport.xMax - viewport.xMin) / 20).toFixed(2)}x</span>
          {isPlaying && (
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Tracing...
            </span>
          )}
        </div>
      </main>
    </div>
  );
}

function HelpPanel() {
  return (
    <div className="text-sm text-slate-400 space-y-4">
      <div>
        <h3 className="text-slate-200 font-medium mb-1.5">Getting Started</h3>
        <p className="leading-relaxed">Type a function using <code className="text-sky-400 font-mono">x</code> as the variable. Press Enter or click + to add it to the graph.</p>
      </div>
      <div>
        <h3 className="text-slate-200 font-medium mb-1.5">Supported Syntax</h3>
        <ul className="space-y-1 leading-relaxed">
          <li><code className="text-sky-400 font-mono">+</code> <code className="text-sky-400 font-mono">-</code> <code className="text-sky-400 font-mono">*</code> <code className="text-sky-400 font-mono">/</code> <code className="text-sky-400 font-mono">^</code> — arithmetic & powers</li>
          <li><code className="text-sky-400 font-mono">sin cos tan</code> — trig functions</li>
          <li><code className="text-sky-400 font-mono">asin acos atan</code> — inverse trig</li>
          <li><code className="text-sky-400 font-mono">sinh cosh tanh</code> — hyperbolic</li>
          <li><code className="text-sky-400 font-mono">log ln log2</code> — logarithms</li>
          <li><code className="text-sky-400 font-mono">sqrt cbrt abs exp</code> — common functions</li>
          <li><code className="text-sky-400 font-mono">floor ceil round sign</code> — rounding</li>
          <li><code className="text-sky-400 font-mono">min(a,b) max(a,b) pow(a,b) mod(a,b)</code> — multi-arg</li>
          <li><code className="text-sky-400 font-mono">pi e tau</code> — constants</li>
        </ul>
      </div>
      <div>
        <h3 className="text-slate-200 font-medium mb-1.5">Audio Trace</h3>
        <p className="leading-relaxed">Click anywhere on the graph to place a trace marker, then press Play. The scanner sweeps across the function, and the y-value is converted to a pitch — higher points sound higher. Zero crossings create ripples.</p>
      </div>
      <div>
        <h3 className="text-slate-200 font-medium mb-1.5">Navigation</h3>
        <ul className="space-y-1 leading-relaxed">
          <li><span className="text-sky-400">Scroll</span> — zoom in/out at cursor</li>
          <li><span className="text-sky-400">Drag</span> — pan the graph</li>
          <li><span className="text-sky-400">Click</span> — place trace marker</li>
        </ul>
      </div>
    </div>
  );
}

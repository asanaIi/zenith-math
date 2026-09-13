import { useEffect, useRef, useCallback } from 'react';
import { GraphRenderer, type RenderedFunction, type Ripple } from '../engine/renderer';
import type { Viewport } from '../types';

type Props = {
  viewport: Viewport;
  functions: RenderedFunction[];
  traceX: number | null;
  tracePoints: { x: number; y: number; color: string }[];
  hoverWorld: { x: number; y: number } | null;
  animProgress: number;
  showGrid: boolean;
  showAxisValues: boolean;
  darkMode: boolean;
  pulsePhase: number;
  isPlaying: boolean;
  ripples: Ripple[];
  showMiniMap: boolean;
  miniViewport: Viewport | null;
  showAudioBars: boolean;
  audioBars: number[];
  showTracePath: boolean;
  tracePath: { x: number; y: number; color: string }[];
  onHover: (world: { x: number; y: number } | null) => void;
  onViewportChange: (vp: Viewport) => void;
  onTraceClick: (worldX: number) => void;
};

export function GraphCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; vp: Viewport } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new GraphRenderer(canvasRef.current);
    const handleResize = () => {
      const canvas = canvasRef.current!;
      const parent = canvas.parentElement!;
      rendererRef.current!.resize(parent.clientWidth, parent.clientHeight);
    };
    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvasRef.current.parentElement!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.render({
      viewport: props.viewport,
      functions: props.functions,
      traceX: props.traceX,
      tracePoints: props.tracePoints,
      hoverWorld: props.hoverWorld,
      animProgress: props.animProgress,
      showGrid: props.showGrid,
      showAxisValues: props.showAxisValues,
      darkMode: props.darkMode,
      pulsePhase: props.pulsePhase,
      isPlaying: props.isPlaying,
      ripples: props.ripples,
      showMiniMap: props.showMiniMap,
      miniViewport: props.miniViewport,
      showAudioBars: props.showAudioBars,
      audioBars: props.audioBars,
      showTracePath: props.showTracePath,
      tracePath: props.tracePath,
    });
  }, [props]);

  const getWorld = useCallback((e: React.MouseEvent) => {
    const r = rendererRef.current!;
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return {
      x: r.toWorldX(sx, props.viewport),
      y: r.toWorldY(sy, props.viewport),
    };
  }, [props.viewport]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) {
      const r = rendererRef.current!;
      const rect = canvasRef.current!.getBoundingClientRect();
      const dx = e.clientX - rect.left - dragRef.current.startX;
      const dy = e.clientY - rect.top - dragRef.current.startY;
      const vp = dragRef.current.vp;
      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;
      const newVp: Viewport = {
        xMin: vp.xMin - (dx / r.width) * xRange,
        xMax: vp.xMax - (dx / r.width) * xRange,
        yMin: vp.yMin + (dy / r.height) * yRange,
        yMax: vp.yMax + (dy / r.height) * yRange,
      };
      props.onViewportChange(newVp);
    } else {
      props.onHover(getWorld(e));
    }
  }, [props, getWorld]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const r = rendererRef.current!;
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      vp: { ...props.viewport },
    };
  }, [props.viewport]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    props.onHover(null);
  }, [props]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const world = getWorld(e);
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
    const vp = props.viewport;
    const newVp: Viewport = {
      xMin: world.x - (world.x - vp.xMin) * zoomFactor,
      xMax: world.x + (vp.xMax - world.x) * zoomFactor,
      yMin: world.y - (world.y - vp.yMin) * zoomFactor,
      yMax: world.y + (vp.yMax - world.y) * zoomFactor,
    };
    props.onViewportChange(newVp);
  }, [props, getWorld]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return;
    const world = getWorld(e);
    props.onTraceClick(world.x);
  }, [props, getWorld]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onClick={handleClick}
    />
  );
}

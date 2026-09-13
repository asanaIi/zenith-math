import type { Viewport } from '../types';
import type { CompiledFunction } from './evaluator';

export type RenderedFunction = {
  fn: CompiledFunction;
  color: string;
  glow: string;
};

export type Ripple = { x: number; y: number; color: string; age: number };

export type RenderOptions = {
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
};

export class GraphRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get width() { return this.canvas.width / this.dpr; }
  get height() { return this.canvas.height / this.dpr; }

  toScreenX(x: number, vp: Viewport): number {
    return ((x - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;
  }

  toScreenY(y: number, vp: Viewport): number {
    return this.height - ((y - vp.yMin) / (vp.yMax - vp.yMin)) * this.height;
  }

  toWorldX(sx: number, vp: Viewport): number {
    return vp.xMin + (sx / this.width) * (vp.xMax - vp.xMin);
  }

  toWorldY(sy: number, vp: Viewport): number {
    return vp.yMin + (1 - sy / this.height) * (vp.yMax - vp.yMin);
  }

  render(opts: RenderOptions) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const vp = opts.viewport;

    ctx.fillStyle = opts.darkMode ? '#0a0e1a' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    if (opts.showGrid) this.drawGrid(vp, opts.darkMode);
    this.drawAxes(vp, opts.darkMode, opts.showAxisValues);

    for (const f of opts.functions) {
      this.drawFunction(f.fn, f.color, f.glow, vp, opts.animProgress);
    }

    if (opts.showTracePath && opts.tracePath.length > 1) {
      ctx.strokeStyle = opts.tracePath[0].color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let i = 0; i < opts.tracePath.length; i++) {
        const p = opts.tracePath[i];
        const sx = this.toScreenX(p.x, vp);
        const sy = this.toScreenY(p.y, vp);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (opts.ripples.length > 0) {
      for (const r of opts.ripples) {
        const rsx = this.toScreenX(r.x, vp);
        const rsy = this.toScreenY(r.y, vp);
        const radius = r.age * 30;
        const alpha = Math.max(0, 1 - r.age);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rsx, rsy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    for (const tp of opts.tracePoints) {
      const sx = this.toScreenX(tp.x, vp);
      const sy = this.toScreenY(tp.y, vp);

      ctx.shadowBlur = 20;
      ctx.shadowColor = tp.color;
      ctx.fillStyle = tp.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = tp.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(opts.pulsePhase);
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (opts.traceX !== null) {
      const sx = this.toScreenX(opts.traceX, vp);
      ctx.strokeStyle = opts.isPlaying ? '#fbbf24' : opts.darkMode ? '#475569' : '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
      ctx.setLineDash([]);

      if (opts.isPlaying) {
        const grad = ctx.createLinearGradient(sx - 20, 0, sx + 20, 0);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
        grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.15)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - 20, 0, 40, h);
      }
    }

    if (opts.hoverWorld) {
      const sx = this.toScreenX(opts.hoverWorld.x, vp);
      const sy = this.toScreenY(opts.hoverWorld.y, vp);
      ctx.strokeStyle = opts.darkMode ? '#334155' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (opts.showAudioBars && opts.audioBars.length > 0) {
      const barWidth = w / opts.audioBars.length;
      for (let i = 0; i < opts.audioBars.length; i++) {
        const barH = opts.audioBars[i] * h * 0.15;
        const hue = 200 + (i / opts.audioBars.length) * 60;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.5)`;
        ctx.fillRect(i * barWidth, h - barH, barWidth - 1, barH);
      }
    }

    if (opts.showMiniMap && opts.miniViewport) {
      this.drawMiniMap(vp, opts.miniViewport, opts.functions, opts.darkMode);
    }
  }

  private drawGrid(vp: Viewport, darkMode: boolean) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const xStep = niceStep((vp.xMax - vp.xMin) / 10);
    const yStep = niceStep((vp.yMax - vp.yMin) / 10);

    ctx.strokeStyle = darkMode ? '#161e2e' : '#f1f5f9';
    const xSub = xStep / 5;
    const ySub = yStep / 5;
    const xSubStart = Math.ceil(vp.xMin / xSub) * xSub;
    for (let x = xSubStart; x <= vp.xMax; x += xSub) {
      const sx = this.toScreenX(x, vp);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
    }
    const ySubStart = Math.ceil(vp.yMin / ySub) * ySub;
    for (let y = ySubStart; y <= vp.yMax; y += ySub) {
      const sy = this.toScreenY(y, vp);
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
    }

    ctx.strokeStyle = darkMode ? '#1e293b' : '#e2e8f0';
    ctx.lineWidth = 1;
    const xStart = Math.ceil(vp.xMin / xStep) * xStep;
    for (let x = xStart; x <= vp.xMax; x += xStep) {
      const sx = this.toScreenX(x, vp);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
    }
    const yStart = Math.ceil(vp.yMin / yStep) * yStep;
    for (let y = yStart; y <= vp.yMax; y += yStep) {
      const sy = this.toScreenY(y, vp);
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
    }
  }

  private drawAxes(vp: Viewport, darkMode: boolean, showValues: boolean) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.strokeStyle = darkMode ? '#475569' : '#64748b';
    ctx.lineWidth = 1.5;

    if (vp.yMin <= 0 && vp.yMax >= 0) {
      const sy = this.toScreenY(0, vp);
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
    }
    if (vp.xMin <= 0 && vp.xMax >= 0) {
      const sx = this.toScreenX(0, vp);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
    }

    if (showValues) {
      ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
      ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
      const xStep = niceStep((vp.xMax - vp.xMin) / 10);
      const yStep = niceStep((vp.yMax - vp.yMin) / 10);

      const xStart = Math.ceil(vp.xMin / xStep) * xStep;
      for (let x = xStart; x <= vp.xMax; x += xStep) {
        if (Math.abs(x) < xStep / 2) continue;
        const sx = this.toScreenX(x, vp);
        const sy = this.toScreenY(0, vp);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ly = Math.min(Math.max(sy + 4, 4), h - 16);
        ctx.fillText(formatNumber(x), sx, ly);
      }

      const yStart = Math.ceil(vp.yMin / yStep) * yStep;
      for (let y = yStart; y <= vp.yMax; y += yStep) {
        if (Math.abs(y) < yStep / 2) continue;
        const sx = this.toScreenX(0, vp);
        const sy = this.toScreenY(y, vp);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const lx = Math.min(Math.max(sx - 6, 30), w - 4);
        ctx.fillText(formatNumber(y), lx, sy);
      }
    }
  }

  private drawFunction(
    fn: CompiledFunction, color: string, glow: string,
    vp: Viewport, progress: number,
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const samples = Math.ceil(w);
    const limit = Math.floor(samples * progress);

    ctx.shadowBlur = 10;
    ctx.shadowColor = glow;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    let prevY: number | null = null;
    let pen = false;

    for (let i = 0; i <= limit; i++) {
      const sx = i;
      const wx = vp.xMin + (i / w) * (vp.xMax - vp.xMin);
      let wy: number;
      try { wy = fn(wx); } catch { wy = NaN; }

      if (!isFinite(wy) || Math.abs(wy) > 1e6) {
        pen = false;
        prevY = null;
        continue;
      }

      const sy = this.toScreenY(wy, vp);

      if (prevY !== null && Math.abs(wy - prevY) > 1e4 && Math.sign(wy) !== Math.sign(prevY)) {
        pen = false;
        prevY = wy;
        continue;
      }

      if (!pen) { ctx.moveTo(sx, sy); pen = true; }
      else ctx.lineTo(sx, sy);
      prevY = wy;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawMiniMap(
    currentVp: Viewport, fullVp: Viewport,
    funcs: RenderedFunction[], darkMode: boolean,
  ) {
    const ctx = this.ctx;
    const mw = 130;
    const mh = 85;
    const mx = this.width - mw - 12;
    const my = 12;

    ctx.fillStyle = darkMode ? 'rgba(10, 14, 26, 0.88)' : 'rgba(248, 250, 252, 0.88)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = darkMode ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    for (const f of funcs) {
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= mw; i++) {
        const wx = fullVp.xMin + (i / mw) * (fullVp.xMax - fullVp.xMin);
        let wy: number;
        try { wy = f.fn(wx); } catch { wy = NaN; }
        if (!isFinite(wy)) { pen = false; continue; }
        const clamped = Math.max(fullVp.yMin, Math.min(fullVp.yMax, wy));
        const sx = mx + i;
        const sy = my + mh - ((clamped - fullVp.yMin) / (fullVp.yMax - fullVp.yMin)) * mh;
        if (!pen) { ctx.moveTo(sx, sy); pen = true; }
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    const rx = mx + ((currentVp.xMin - fullVp.xMin) / (fullVp.xMax - fullVp.xMin)) * mw;
    const ry = my + (1 - (currentVp.yMax - fullVp.yMin) / (fullVp.yMax - fullVp.yMin)) * mh;
    const rw = ((currentVp.xMax - currentVp.xMin) / (fullVp.xMax - fullVp.xMin)) * mw;
    const rh = ((currentVp.yMax - currentVp.yMin) / (fullVp.yMax - fullVp.yMin)) * mh;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);
  }
}

function niceStep(rough: number): number {
  const exp = Math.floor(Math.log10(rough));
  const f = rough / Math.pow(10, exp);
  let nice: number;
  if (f < 1.5) nice = 1;
  else if (f < 3) nice = 2;
  else if (f < 7) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

function formatNumber(n: number): string {
  if (Math.abs(n) < 1e-10) return '0';
  if (Math.abs(n) >= 10000 || Math.abs(n) < 0.001) return n.toExponential(1);
  return parseFloat(n.toPrecision(4)).toString();
}

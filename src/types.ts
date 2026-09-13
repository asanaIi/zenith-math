export type FunctionColor = {
  stroke: string;
  glow: string;
};

export type GraphFunction = {
  id: string;
  expression: string;
  color: FunctionColor;
  visible: boolean;
  error: string | null;
};

export type Viewport = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type TracePoint = {
  x: number;
  y: number;
  funcId: string;
};

export type Vec2 = { x: number; y: number };

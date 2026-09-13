export const FUNCTION_COLORS = [
  { stroke: '#38bdf8', glow: 'rgba(56, 189, 248, 0.35)' },
  { stroke: '#f97316', glow: 'rgba(249, 115, 22, 0.35)' },
  { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.35)' },
  { stroke: '#ec4899', glow: 'rgba(236, 72, 153, 0.35)' },
  { stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.35)' },
  { stroke: '#14b8a6', glow: 'rgba(20, 184, 166, 0.35)' },
  { stroke: '#a78bfa', glow: 'rgba(167, 139, 250, 0.35)' },
  { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.35)' },
];

export function getColor(index: number) {
  return FUNCTION_COLORS[index % FUNCTION_COLORS.length];
}

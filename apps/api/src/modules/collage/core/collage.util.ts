export function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function normBox(b: any) {
  const x = clamp01(Number(b?.x ?? 0));
  const y = clamp01(Number(b?.y ?? 0));
  const w = clamp01(Number(b?.w ?? 0.3));
  const h = clamp01(Number(b?.h ?? 0.3));
  return {
    x,
    y,
    w: Math.max(0.02, Math.min(0.98 - x, w)),
    h: Math.max(0.02, Math.min(0.98 - y, h)),
  };
}

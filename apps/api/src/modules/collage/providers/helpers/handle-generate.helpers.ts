import { CollageGenerateParams, CollagePlan } from "../../collage.types";
import { normBox } from "../../utils";


export type CollageReporter = (stage: string, percent: number, message?: string) => void;

export function createReporter(params: CollageGenerateParams): CollageReporter {
  return (stage: string, percent: number, message?: string) => {
    try {
      params.onProgress?.({ stage, percent, message });
    } catch {
      // ignore
    }
  };
}

// Doubao Seedream 4.5 约束：image size must be at least 3,686,400 pixels
// 这里做一个兜底：当调用方没传或传得过小，自动抬升到满足阈值的尺寸。
const MIN_IMAGE_PIXELS = 3_686_400;

function ensureMinPixelsSize(width: number, height: number) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const pixels = w * h;
  if (pixels >= MIN_IMAGE_PIXELS) return { width: w, height: h };

  // 保持纵横比，整体放大到满足最小像素数
  const scale = Math.sqrt(MIN_IMAGE_PIXELS / pixels);
  return {
    width: Math.ceil(w * scale),
    height: Math.ceil(h * scale),
  };
}

export function getCanvas(params: CollageGenerateParams) {
  // 默认提升到满足 Doubao 最小像素数的安全值
  const rawWidth = params.width ?? 1920;
  const rawHeight = params.height ?? 1920;
  const { width, height } = ensureMinPixelsSize(rawWidth, rawHeight);
  return { width, height, size: `${width}x${height}` };
}

export function getDefaultStickerPlacements(params: {
  assets: Array<{ id: string }>;
  boxes?: Array<{ x: number; y: number; w: number; h: number; rotate: number }>;
}) {
  const boxes =
    params.boxes ??
    [
      { x: 0.75, y: 0.2, w: 0.16, h: 0.16, rotate: 10 },
      { x: 0.57, y: 0.75, w: 0.16, h: 0.16, rotate: -8 },
    ];

  return params.assets.slice(0, boxes.length).map((a, idx) => ({
    elementId: a.id,
    ...normBox(boxes[idx]),
    rotate: boxes[idx].rotate,
  }));
}

export function normalizeLayout(params: {
  plan: CollagePlan;
  width: number;
  height: number;
  photoCount: number;
  fallbackLayout: any;
}) {
  const { plan, width, height, photoCount, fallbackLayout } = params;

  const l: any = (plan as any)?.layout;
  if (!l || !Array.isArray(l.photos) || !Array.isArray(l.texts)) return fallbackLayout;

  // canvas 兜底
  l.canvas = { width, height };

  // photos：限制 sourceIndex + box
  l.photos = (l.photos as any[])
    .filter(Boolean)
    .map((p: any, idx: number) => {
      const box = normBox(p);
      const sourceIndex = Math.max(0, Math.min(photoCount - 1, Number(p?.sourceIndex ?? idx)));
      return {
        id: String(p?.id || `p${idx}`),
        sourceIndex,
        ...box,
        rotate: Number(p?.rotate ?? 0),
        style: p?.style === 'tape' || p?.style === 'clean' || p?.style === 'polaroid' ? p.style : 'polaroid',
        cornerRadius: Number.isFinite(Number(p?.cornerRadius)) ? Number(p.cornerRadius) : 12,
        shadow: Boolean(p?.shadow ?? true),
      };
    });

  // texts：box + 默认值
  l.texts = (l.texts as any[])
    .filter(Boolean)
    .map((t: any, idx: number) => {
      const box = normBox(t);
      const kind = t?.kind === 'date' || t?.kind === 'title' || t?.kind === 'body' ? t.kind : 'body';
      return {
        id: String(t?.id || `t${idx}`),
        kind,
        text: String(t?.text || ''),
        ...box,
        align: t?.align === 'center' || t?.align === 'right' ? t.align : 'left',
        fontSize: Number.isFinite(Number(t?.fontSize)) ? Number(t.fontSize) : undefined,
        color: typeof t?.color === 'string' ? t.color : undefined,
        fontFamily: t?.fontFamily === 'serif' ? 'serif' : 'sans',
        rotate: Number(t?.rotate ?? 0),
      };
    });

  // stickers：box
  l.stickers = Array.isArray(l.stickers)
    ? (l.stickers as any[])
        .filter(Boolean)
        .map((s: any) => ({
          elementId: String(s?.elementId || ''),
          ...normBox(s),
          rotate: Number(s?.rotate ?? 0),
        }))
        .filter((s: any) => s.elementId)
    : [];

  return l;
}

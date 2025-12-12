import { AiError } from '../../../common/ai-error';

const sharp = require('sharp');

export async function fileToPngBuffer(file: any): Promise<Buffer> {
  const buf: Buffer | undefined = file?.buffer;
  if (!buf) throw new Error('Invalid upload file buffer');
  return sharp(buf).rotate().png().toBuffer();
}

export async function fileToPngBase64(file: any): Promise<string> {
  const out = await fileToPngBuffer(file);
  return out.toString('base64');
}

export function safeCompositeRect(params: {
  canvasW: number;
  canvasH: number;
  left: number;
  top: number;
  inputW: number;
  inputH: number;
}): { left: number; top: number; w: number; h: number } | null {
  const left = Math.floor(params.left);
  const top = Math.floor(params.top);
  const inW = Math.floor(params.inputW);
  const inH = Math.floor(params.inputH);

  if (inW <= 0 || inH <= 0) return null;

  const canvasW = Math.floor(params.canvasW);
  const canvasH = Math.floor(params.canvasH);

  const x0 = Math.max(0, left);
  const y0 = Math.max(0, top);
  const x1 = Math.min(canvasW, left + inW);
  const y1 = Math.min(canvasH, top + inH);

  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return null;

  return { left: x0, top: y0, w, h };
}

export async function cropToCanvas(params: {
  input: Buffer;
  canvasW: number;
  canvasH: number;
  left: number;
  top: number;
}): Promise<{ input: Buffer; left: number; top: number } | null> {
  const meta = await sharp(params.input).metadata();
  const inW = meta.width ?? 0;
  const inH = meta.height ?? 0;

  const rect = safeCompositeRect({
    canvasW: params.canvasW,
    canvasH: params.canvasH,
    left: params.left,
    top: params.top,
    inputW: inW,
    inputH: inH,
  });
  if (!rect) return null;

  const extractLeft = rect.left - Math.floor(params.left);
  const extractTop = rect.top - Math.floor(params.top);

  const cropped =
    extractLeft === 0 && extractTop === 0 && rect.w === inW && rect.h === inH
      ? params.input
      : await sharp(params.input)
          .extract({ left: extractLeft, top: extractTop, width: rect.w, height: rect.h })
          .png()
          .toBuffer();

  return { input: cropped, left: rect.left, top: rect.top };
}

export function svgTextOverlay(params: {
  width: number;
  height: number;
  texts: Array<{
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    color?: string;
    fontFamily?: string;
    rotate?: number;
    weight?: number;
  }>;
}): Buffer {
  const escape = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const els = params.texts
    .filter((t) => t?.text?.trim())
    .map((t) => {
      const x = Math.round(t.x);
      const y = Math.round(t.y);
      const w = Math.round(t.w);
      const h = Math.round(t.h);
      const fontSize = Math.max(12, Math.round(t.fontSize ?? 28));
      const color = t.color || '#111827';
      const align = t.align || 'left';
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
      const xAnchor = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
      const yBase = y + fontSize;
      const family = t.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif';
      const weight = t.weight ?? 600;
      const transform = t.rotate ? ` transform="rotate(${t.rotate} ${x + w / 2} ${y + h / 2})"` : '';

      return `<text${transform} x="${xAnchor}" y="${yBase}" text-anchor="${anchor}" fill="${color}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}">${escape(
        t.text,
      )}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}">${els}</svg>`;
  return Buffer.from(svg);
}

export async function renderPolaroidFrame(params: {
  image: Buffer;
  width: number;
  height: number;
  cornerRadius: number;
  shadow: boolean;
}) {
  const photo = await sharp(params.image)
    .resize({ width: params.width, height: params.height, fit: 'cover' })
    .png()
    .toBuffer();

  const pad = Math.round(Math.min(params.width, params.height) * 0.08);
  const bottomPad = Math.round(pad * 1.8);

  const frameW = params.width + pad * 2;
  const frameH = params.height + pad + bottomPad;

  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}"><rect x="0" y="0" width="${params.width}" height="${params.height}" rx="${params.cornerRadius}" ry="${params.cornerRadius}" fill="#fff"/></svg>`,
  );

  const clipped = await sharp(photo)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const frame = await sharp({
    create: {
      width: frameW,
      height: frameH,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([{ input: clipped, left: pad, top: pad }])
    .png()
    .toBuffer();

  if (!params.shadow) return frame;

  const shadow = await sharp(frame).tint('#000000').modulate({ brightness: 0.2 }).blur(12).png().toBuffer();

  const withShadow = await sharp({
    create: {
      width: frameW + 24,
      height: frameH + 24,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shadow, left: 16, top: 16 },
      { input: frame, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  return withShadow;
}

export type PreparedImages = {
  photoFiles: any[];
  photoCount: number;
  photoPngs: Buffer[];
  imagesB64: string[];
};

export async function prepareImages(files: any[] | undefined, maxCount = 3): Promise<PreparedImages> {
  const photoFiles = (files || []).slice(0, maxCount);
  const photoCount = photoFiles.length;

  const photoPngs: Buffer[] = [];
  const imagesB64: string[] = [];

  for (const f of photoFiles) {
    const png = await fileToPngBuffer(f);
    photoPngs.push(png);
    imagesB64.push(png.toString('base64'));
  }

  return { photoFiles, photoCount, photoPngs, imagesB64 };
}

/**
 * 可选：将错误包装为 AiError（用于 provider 的统一 catch 逻辑）。
 * 目前未强制使用，保留是为将来新增 provider 复用。
 */
export function wrapAsAiError(e: any, params: { code: string; status: number; fallbackMessage: string }) {
  if (e?.name === 'AiError') return e;
  return new AiError({
    code: params.code as any,
    status: params.status,
    message: e?.message || params.fallbackMessage,
  });
}

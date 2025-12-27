import { Injectable } from '@nestjs/common';

import type { CollageGenerateParams, CollageGenerateResult, CollagePlan } from '../../collage.types';
import { AiError } from '../../../../common/errors/ai-error';
import { createReporter, getCanvas, getDefaultStickerPlacements, normalizeLayout } from '../helpers/handle-generate.helpers';
import {
  cropToCanvas,
  prepareImages as prepareImagesShared,
  renderPolaroidFrame as renderPolaroidFrameShared,
  svgTextOverlay as svgTextOverlayShared,
} from '../helpers/handle-image.helpers';
import { DoubaoClient } from './doubao.client';
import { normBox } from '../../utils';
import { CollageProvider } from '../provider.contract';

const sharp = require('sharp');

@Injectable()
export class DoubaoCollageProvider implements CollageProvider {
  readonly id = 'doubao';

  constructor(private readonly doubao: DoubaoClient) {}

  private coerceStyle(style?: string, templateId?: string) {
    if (style?.trim()) return style.trim();
    switch (templateId) {
      case 'vintage-journal':
        return 'vintage journal scrapbook, paper texture, washi tape, film grain';
      case 'cyberpunk':
        return 'cyberpunk neon collage, glitch, hologram stickers, dark city';
      case 'healing-illustration':
        return 'healing pastel illustration collage, warm light, cute doodles';
      case 'minimal-paper':
        return 'minimal paper collage, clean grid, whitespace, editorial';
      case 'polaroid-wall':
        return 'polaroid photo wall collage, tape, pin board, soft shadow';
      default:
        return 'vintage journal scrapbook, paper texture, unified collage style';
    }
  }

  private defaultLayout(params: { width: number; height: number; photoCount: number }) {
    const { width, height, photoCount } = params;

    const photos = [] as any[];
    if (photoCount >= 1) {
      photos.push({
        id: 'p0',
        sourceIndex: 0,
        ...normBox({ x: 0.08, y: 0.32, w: 0.56, h: 0.52 }),
        rotate: -2,
        style: 'polaroid',
        cornerRadius: 12,
        shadow: true,
      });
    }
    if (photoCount >= 2) {
      photos.push({
        id: 'p1',
        sourceIndex: 1,
        ...normBox({ x: 0.68, y: 0.42, w: 0.24, h: 0.22 }),
        rotate: 2,
        style: 'polaroid',
        cornerRadius: 12,
        shadow: true,
      });
    }
    if (photoCount >= 3) {
      photos.push({
        id: 'p2',
        sourceIndex: 2,
        ...normBox({ x: 0.68, y: 0.67, w: 0.24, h: 0.22 }),
        rotate: -1,
        style: 'polaroid',
        cornerRadius: 12,
        shadow: true,
      });
    }

    // 文案区域：根据画布尺寸给更充足的高度，避免长句被截断
    const minSide = Math.min(width, height);
    const dateH = 0.07;
    const titleH = 0.125;
    const bodyH = 0.105; // 原来 0.07 太紧，改为更合理的默认高度

    return {
      canvas: { width, height },
      backgroundStyle: 'paper',
      photos,
      texts: [
        {
          id: 't-date',
          kind: 'date',
          text: new Date().toISOString().slice(0, 10),
          ...normBox({ x: 0.08, y: 0.07, w: 0.84, h: dateH }),
          align: 'left',
          fontSize: Math.round(minSide * 0.04),
          color: '#1f2937',
          fontFamily: 'sans',
        },
        {
          id: 't-title',
          kind: 'title',
          text: '海边漫步，自由如风',
          ...normBox({ x: 0.08, y: 0.15, w: 0.84, h: titleH }),
          align: 'left',
          fontSize: Math.round(minSide * 0.075),
          color: '#0f766e',
          fontFamily: 'serif',
        },
        {
          id: 't-body',
          kind: 'body',
          text: '今天和朋友一起来到海边，阳光晒在身上暖暖的，听着海浪，吹着海风，特别的治愈。',
          ...normBox({ x: 0.08, y: 0.27, w: 0.84, h: bodyH }),
          align: 'left',
          fontSize: Math.round(minSide * 0.032),
          color: '#111827',
          fontFamily: 'sans',
        },
      ],
      stickers: [],
    };
  }

  private svgTextOverlay(params: {
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
    return svgTextOverlayShared(params as any);
  }

  private async renderPolaroidFrame(params: {
    image: Buffer;
    width: number;
    height: number;
    cornerRadius: number;
    shadow: boolean;
  }) {
    return renderPolaroidFrameShared(params as any);
  }

  private async cropToCanvas(params: {
    input: Buffer;
    canvasW: number;
    canvasH: number;
    left: number;
    top: number;
  }): Promise<{ input: Buffer; left: number; top: number } | null> {
    return cropToCanvas(params as any);
  }

  private async prepareImages(params: CollageGenerateParams) {
    return prepareImagesShared(params.files, 3);
  }

  private createReporter(params: CollageGenerateParams) {
    return createReporter(params);
  }

  private getCanvas(params: CollageGenerateParams) {
    return getCanvas(params);
  }

  private normalizeLayout(params: {
    plan: CollagePlan;
    width: number;
    height: number;
    photoCount: number;
    fallbackLayout: any;
  }) {
    return normalizeLayout(params);
  }

  private getStickerPlacements(params: {
    layout: any;
    assets: Array<{ id: string; kind: string; base64: string; prompt: string }>;
  }) {
    return params.layout.stickers?.length ? params.layout.stickers : getDefaultStickerPlacements({ assets: params.assets });
  }

  private buildBackgroundPrompt(params: {
    prompt: string;
    style: string;
    plan: CollagePlan;
  }) {
    return [
      'A clean journal scrapbook paper background for a collage layout. Soft paper texture, subtle grain, gentle vignette, lots of whitespace.',
      `Theme: ${params.prompt}`,
      `Style: ${(params.plan as any)?.style || params.style}`,
      (params.plan as any)?.palette?.length ? `Palette: ${(params.plan as any).palette.join(', ')}` : undefined,
      `Background design: ${(params.plan as any)?.backgroundPrompt || ''}`,
      'Must NOT contain readable text, watermark, logo, or photo-like subjects. Background only.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async generateBackground(params: { backgroundPrompt: string; size: string }) {
    return this.doubao.imageB64({ prompt: params.backgroundPrompt, size: params.size });
  }

  private async generateStickerAssets(params: { plan: CollagePlan; style: string }) {
    const assets: Array<{ id: string; kind: string; base64: string; prompt: string }> = [];

    for (const el of ((params.plan as any)?.elements || []).slice(0, 8)) {
      const id = el.id;
      const elementPrompt = [
        'A single decorative sticker, isolated, centered, high quality, PNG, transparent background. Use simple illustration style, like scrapbook stickers.',
        `Kind: ${el.kind}`,
        `Style: ${(params.plan as any)?.style || params.style}`,
        (params.plan as any)?.palette?.length ? `Palette: ${(params.plan as any).palette.join(', ')}` : undefined,
        `Element: ${el.prompt}`,
        'No readable text, no watermark, no logo.',
      ]
        .filter(Boolean)
        .join('\n');

      // Seedream 返回可能是 JPEG/PNG，且不一定支持透明背景；这里仍按 base64 原图接收，后续用 sharp 做 PNG 处理
      const base64 = await this.doubao.imageB64({ prompt: elementPrompt, size: '1024x1024' });
      assets.push({ id, kind: el.kind, base64, prompt: el.prompt });
    }

    return assets;
  }

  private async buildPhotoComposites(params: { layout: any; photoPngs: Buffer[]; width: number; height: number }) {
    const composites: any[] = [];

    for (const p of params.layout.photos) {
      const src = params.photoPngs[p.sourceIndex];
      if (!src) continue;

      const px = Math.round(p.x * params.width);
      const py = Math.round(p.y * params.height);
      const pw = Math.round(p.w * params.width);
      const ph = Math.round(p.h * params.height);

      let rendered: Buffer;
      if (p.style === 'clean') {
        rendered = await sharp(src).resize({ width: pw, height: ph, fit: 'cover' }).png().toBuffer();
      } else {
        rendered = await this.renderPolaroidFrame({
          image: src,
          width: pw,
          height: ph,
          cornerRadius: Math.max(0, Math.round(p.cornerRadius ?? 12)),
          shadow: Boolean(p.shadow),
        });
      }

      if (p.rotate) {
        rendered = await sharp(rendered)
          .rotate(p.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      }

      const clipped = await this.cropToCanvas({ input: rendered, canvasW: params.width, canvasH: params.height, left: px, top: py });
      if (clipped) composites.push(clipped);
    }

    return composites;
  }

  private async buildStickerComposites(params: {
    stickerPlacements: any[];
    assets: Array<{ id: string; kind: string; base64: string; prompt: string }>;
    width: number;
    height: number;
  }) {
    const composites: any[] = [];

    for (const s of params.stickerPlacements) {
      const asset = params.assets.find((a) => a.id === s.elementId) || params.assets.find((a) => a.kind === 'sticker');
      if (!asset) continue;

      const px = Math.round(s.x * params.width);
      const py = Math.round(s.y * params.height);
      const pw = Math.round(s.w * params.width);
      const ph = Math.round(s.h * params.height);

      let buf = Buffer.from(asset.base64, 'base64');
      // 统一转 png，并尽量抠出透明（如果原图无 alpha，这里无法真正透明，只能按原图合成）
      buf = await sharp(buf).resize({ width: pw, height: ph, fit: 'inside' }).png().toBuffer();

      if (s.rotate) {
        buf = await sharp(buf)
          .rotate(s.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      }

      const clipped = await this.cropToCanvas({ input: buf, canvasW: params.width, canvasH: params.height, left: px, top: py });
      if (clipped) composites.push(clipped);
    }

    return composites;
  }

  private buildTextOverlays(params: { layout: any; width: number; height: number }) {
    return params.layout.texts.map((t: any) => {
      const px = Math.round(t.x * params.width);
      const py = Math.round(t.y * params.height);
      const pw = Math.round(t.w * params.width);
      let ph = Math.round(t.h * params.height);

      const isTitle = t.kind === 'title';
      const fontSize =
        t.fontSize ??
        (isTitle ? Math.round(Math.min(params.width, params.height) * 0.07) : Math.round(Math.min(params.width, params.height) * 0.032));

      // body 文案根据长度给一点自适应高度（配合 svgTextOverlay 的自动换行）
      if (t.kind === 'body') {
        const textLen = String(t.text || '').trim().length;
        const approxLines = Math.max(1, Math.ceil(textLen / 26));
        const lineHeight = Math.round(fontSize * 1.25);
        const needH = approxLines * lineHeight + Math.round(fontSize * 0.4);
        ph = Math.max(ph, needH);
      }

      return {
        text: t.text,
        x: px,
        y: py,
        w: pw,
        h: ph,
        align: t.align,
        fontSize,
        color: t.color ?? (isTitle ? '#0f766e' : '#111827'),
        fontFamily: t.fontFamily ?? (isTitle ? 'serif' : 'sans'),
        rotate: t.rotate,
        weight: isTitle ? 700 : 500,
      };
    });
  }

  private async buildTextComposite(params: { textOverlays: any[]; width: number; height: number }) {
    const textSvg = this.svgTextOverlay({ width: params.width, height: params.height, texts: params.textOverlays });
    return this.cropToCanvas({ input: textSvg, canvasW: params.width, canvasH: params.height, left: 0, top: 0 });
  }

  private async composeFinalImage(params: { backgroundBase64: string; width: number; height: number; composites: any[] }) {
    const bgBuf = Buffer.from(params.backgroundBase64, 'base64');
    const canvas = sharp(bgBuf).resize({ width: params.width, height: params.height, fit: 'cover' }).png();
    return canvas.composite(params.composites).png({ quality: 100 }).toBuffer();
  }

  private getDefaultTexts(params: CollageGenerateParams, canvas: { width: number; height: number }) {
    const minSide = Math.min(canvas.width, canvas.height);

    const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

    const dateText = trim(params.dateText) || new Date().toISOString().slice(0, 10);
    const titleText = trim(params.titleText);
    const bodyText = trim(params.bodyText) || (!titleText ? trim(params.prompt) : '');

    return {
      date: {
        id: 't-date',
        kind: 'date',
        text: dateText,
        ...normBox({ x: 0.08, y: 0.07, w: 0.84, h: 0.07 }),
        align: 'left',
        fontSize: Math.round(minSide * 0.04),
        color: '#1f2937',
        fontFamily: 'sans',
      },
      title: {
        id: 't-title',
        kind: 'title',
        text: titleText,
        ...normBox({ x: 0.08, y: 0.15, w: 0.84, h: 0.125 }),
        align: 'left',
        fontSize: Math.round(minSide * 0.075),
        color: '#0f766e',
        fontFamily: 'serif',
      },
      body: {
        id: 't-body',
        kind: 'body',
        text: bodyText,
        ...normBox({ x: 0.08, y: 0.27, w: 0.84, h: 0.105 }),
        align: 'left',
        fontSize: Math.round(minSide * 0.032),
        color: '#111827',
        fontFamily: 'sans',
      },
    };
  }

  async generate(params: CollageGenerateParams): Promise<CollageGenerateResult> {
    const report = this.createReporter(params);

    try {
      report('init', 0.02, '开始处理输入');

      const { width, height, size } = this.getCanvas(params);
      const style = this.coerceStyle(params.style, params.templateId);

      report('prepare_images', 0.08, '读取并转换图片');
      const { photoCount, photoPngs } = await this.prepareImages(params);

      const fallbackLayout = this.defaultLayout({ width, height, photoCount });

      const defaultTexts = this.getDefaultTexts(params, { width, height });
      (fallbackLayout as any).texts = [defaultTexts.date, defaultTexts.title, defaultTexts.body].filter((x: any) => String(x.text || '').trim());

      const plan: CollagePlan = {
        style,
        palette: [],
        backgroundPrompt: params.prompt,
        elements: [
          { id: 'st-1', kind: 'sticker', prompt: 'small cute doodle sticker, minimal' },
          { id: 'st-2', kind: 'decoration', prompt: 'washi tape strip, paper texture' },
        ],
        layout: fallbackLayout as any,
        notes: 'Plan generated locally (fallback).',
      };

      const layout = this.normalizeLayout({ plan, width, height, photoCount, fallbackLayout });

      report('background', 0.42, '生成背景');
      const backgroundPrompt = this.buildBackgroundPrompt({ prompt: params.prompt, style, plan });
      const backgroundBase64 = await this.generateBackground({ backgroundPrompt, size });

      report('stickers', 0.62, '生成贴纸素材');
      const assets = await this.generateStickerAssets({ plan, style });

      report('compose', 0.82, '合成图片');
      const composites: any[] = [];

      composites.push(...(await this.buildPhotoComposites({ layout, photoPngs, width, height })));

      const stickerPlacements = this.getStickerPlacements({ layout, assets });
      composites.push(...(await this.buildStickerComposites({ stickerPlacements, assets, width, height })));

      const textOverlays = this.buildTextOverlays({ layout, width, height });
      const safeText = await this.buildTextComposite({ textOverlays, width, height });
      if (safeText) composites.push(safeText);

      const outBuf = await this.composeFinalImage({ backgroundBase64, width, height, composites });

      report('done', 1, '完成');

      (plan as any).layout = layout;
      (plan as any).backgroundPrompt = (plan as any).backgroundPrompt || backgroundPrompt;

      return {
        imageBase64: outBuf.toString('base64'),
        backgroundBase64,
        assets,
        plan,
      };
    } catch (e: any) {
      if (e?.name === 'AiError') throw e;
      throw new AiError({
        code: 'IMAGE_COMPOSE_ERROR',
        status: 500,
        message: e?.message || 'Image compose failed',
      });
    }
  }
}
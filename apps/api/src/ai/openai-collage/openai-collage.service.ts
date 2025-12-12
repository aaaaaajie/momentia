import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

import { CollageGenerateResult, CollagePlan } from './openai-collage.types';

// NOTE: Node 内置 fetch(undici) 需要 undici dispatcher；https-proxy-agent 不兼容 dispatcher
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ProxyAgent } = require('undici');

@Injectable()
export class OpenAiCollageService {
  constructor(private readonly config: ConfigService) {}

  private requireEnv(name: string) {
    const v = this.config.get<string>(name);
    if (!v) throw new Error(`Missing ${name} in environment variables.`);
    return v;
  }

  private clamp01(x: number) {
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(1, x));
  }

  private normBox(b: any) {
    const x = this.clamp01(Number(b?.x ?? 0));
    const y = this.clamp01(Number(b?.y ?? 0));
    const w = this.clamp01(Number(b?.w ?? 0.3));
    const h = this.clamp01(Number(b?.h ?? 0.3));
    return {
      x,
      y,
      w: Math.max(0.02, Math.min(0.98 - x, w)),
      h: Math.max(0.02, Math.min(0.98 - y, h)),
    };
  }

  private async fileToPngBuffer(file: any): Promise<Buffer> {
    const buf: Buffer | undefined = file?.buffer;
    if (!buf) throw new Error('Invalid upload file buffer');
    return sharp(buf).rotate().png().toBuffer();
  }

  private async fileToPngBase64(file: any): Promise<string> {
    const out = await this.fileToPngBuffer(file);
    return out.toString('base64');
  }

  private getProxyDispatcher(): any | undefined {
    const proxy =
      this.config.get<string>('OPENAI_PROXY') ||
      this.config.get<string>('HTTPS_PROXY') ||
      this.config.get<string>('https_proxy') ||
      this.config.get<string>('HTTP_PROXY') ||
      this.config.get<string>('http_proxy');
    if (!proxy) return undefined;
    return new ProxyAgent(proxy);
  }

  private async openaiChatJson<T>(params: { model: string; messages: any[] }): Promise<T> {
    const apiKey = this.requireEnv('OPENAI_API_KEY');
    const dispatcher = this.getProxyDispatcher();

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: params.messages,
        }),
        ...(dispatcher ? { dispatcher } : {}),
      } as any);
    } catch (e: any) {
      const proxyHint = dispatcher ? ' (using proxy)' : ' (no proxy set)';
      throw new Error(`OpenAI chat network error${proxyHint}: ${e?.message || String(e)}`);
    }

    const text = await res.text();
    if (!res.ok) throw new Error(`OpenAI chat error: ${res.status} ${res.statusText} - ${text}`);
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('OpenAI chat: empty response');
    return JSON.parse(content) as T;
  }

  private normalizeOpenAiImageSize(params: { width: number; height: number }): string {
    // 不同图片模型支持的 size 枚举不同：
    // - gpt-image-1: '1024x1024' | '1024x1536' | '1536x1024' | 'auto'
    // - dall-e-3:   '1024x1024' | '1024x1792' | '1792x1024'
    const model = (this.config.get<string>('OPENAI_IMAGE_MODEL') || 'gpt-image-1').toLowerCase();

    const w = Math.max(1, Math.floor(params.width));
    const h = Math.max(1, Math.floor(params.height));
    const ratio = w / h;

    const isSquare = ratio > 0.85 && ratio < 1.18;
    const isLandscape = ratio >= 1.18;

    if (model.includes('dall-e-3') || model.includes('dall-e-2') || model.includes('dalle')) {
      if (isSquare) return '1024x1024';
      if (isLandscape) return '1792x1024';
      return '1024x1792';
    }

    // 默认按 gpt-image-1 的枚举
    if (isSquare) return '1024x1024';
    if (isLandscape) return '1536x1024';
    return '1024x1536';
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private shouldRetryOpenAiStatus(status: number) {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private async fetchWithRetry(params: {
    url: string;
    init: any;
    retries?: number;
    baseDelayMs?: number;
    dispatcher?: any;
  }): Promise<Response> {
    const retries = Math.max(0, Math.min(6, params.retries ?? 3));
    const baseDelayMs = Math.max(100, params.baseDelayMs ?? 500);

    let lastErr: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res: Response = await fetch(params.url, {
          ...(params.init || {}),
          ...(params.dispatcher ? { dispatcher: params.dispatcher } : {}),
        } as any);

        if (!this.shouldRetryOpenAiStatus(res.status) || attempt >= retries) return res;

        // 读取 body 以便连接复用；并在最后一次时原样返回
        await res.arrayBuffer().catch(() => undefined);

        const jitter = Math.floor(Math.random() * 200);
        const delay = Math.floor(baseDelayMs * Math.pow(2, attempt)) + jitter;
        await this.sleep(delay);
        continue;
      } catch (e: any) {
        lastErr = e;
        if (attempt >= retries) throw e;
        const jitter = Math.floor(Math.random() * 200);
        const delay = Math.floor(baseDelayMs * Math.pow(2, attempt)) + jitter;
        await this.sleep(delay);
      }
    }

    throw lastErr || new Error('fetchWithRetry: unknown error');
  }

  private async openaiImageB64(params: {
    prompt: string;
    size: string;
    background?: 'transparent' | 'opaque';
  }): Promise<string> {
    const apiKey = this.requireEnv('OPENAI_API_KEY');
    const model = this.config.get<string>('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
    const dispatcher = this.getProxyDispatcher();

    // 兼容：如果传进来是任意 WxH，映射到 OpenAI 支持的 size 集合
    const normalizedSize = (() => {
      const m = /^\s*(\d+)\s*x\s*(\d+)\s*$/i.exec(params.size || '');
      if (!m) return '1024x1024';
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '1024x1024';
      return this.normalizeOpenAiImageSize({ width: w, height: h });
    })();

    let res: Response;
    try {
      // OpenAI Images 生成接口: /v1/images/generations
      res = await this.fetchWithRetry({
        url: 'https://api.openai.com/v1/images/generations',
        dispatcher,
        retries: 3,
        baseDelayMs: 600,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: params.prompt,
            size: normalizedSize,
            n: 1,
          }),
        },
      });
    } catch (e: any) {
      const proxyHint = dispatcher ? ' (using proxy)' : ' (no proxy set)';
      throw new Error(`OpenAI images network error${proxyHint}: ${e?.message || String(e)}`);
    }

    const text = await res.text();
    if (!res.ok)
      throw new Error(
        `OpenAI images error: ${res.status} ${res.statusText} (model=${model}, size=${normalizedSize}) - ${text}`,
      );

    if (!text.trim().startsWith('{')) {
      throw new Error(
        `OpenAI images: expected JSON response but got non-JSON body (status ${res.status}). Body head: ${text
          .slice(0, 200)
          .replace(/\s+/g, ' ')}`,
      );
    }

    const json = JSON.parse(text);
    const b64 = json?.data?.[0]?.b64_json;
    if (b64) return b64;

    // 兼容某些场景返回 url（例如代理/兼容层）
    const url = json?.data?.[0]?.url;
    if (typeof url === 'string' && url.startsWith('http')) {
      let imgRes: Response;
      try {
        imgRes = await fetch(url, {
          ...(dispatcher ? { dispatcher } : {}),
        } as any);
      } catch (e: any) {
        const proxyHint = dispatcher ? ' (using proxy)' : ' (no proxy set)';
        throw new Error(`OpenAI images download network error${proxyHint}: ${e?.message || String(e)}`);
      }

      const arr = await imgRes.arrayBuffer();
      if (!imgRes.ok) {
        throw new Error(
          `OpenAI images download error: ${imgRes.status} ${imgRes.statusText} - ${Buffer.from(arr)
            .toString('utf8')
            .slice(0, 200)}`,
        );
      }
      return Buffer.from(arr).toString('base64');
    }

    throw new Error('OpenAI images: empty b64_json (and no url fallback)');
  }

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

    // 模仿示例：顶部日期 + 大标题；中间“左大图 + 右两张小图”；下方正文
    const photos = [] as any[];
    if (photoCount >= 1) {
      photos.push({
        id: 'p0',
        sourceIndex: 0,
        ...this.normBox({ x: 0.08, y: 0.32, w: 0.56, h: 0.52 }),
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
        ...this.normBox({ x: 0.68, y: 0.42, w: 0.24, h: 0.22 }),
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
        ...this.normBox({ x: 0.68, y: 0.67, w: 0.24, h: 0.22 }),
        rotate: -1,
        style: 'polaroid',
        cornerRadius: 12,
        shadow: true,
      });
    }

    return {
      canvas: { width, height },
      backgroundStyle: 'paper',
      photos,
      texts: [
        {
          id: 't-date',
          kind: 'date',
          text: new Date().toISOString().slice(0, 10),
          ...this.normBox({ x: 0.08, y: 0.07, w: 0.84, h: 0.08 }),
          align: 'left',
          fontSize: Math.round(Math.min(width, height) * 0.04),
          color: '#1f2937',
          fontFamily: 'sans',
        },
        {
          id: 't-title',
          kind: 'title',
          text: '海边漫步，自由如风',
          ...this.normBox({ x: 0.08, y: 0.15, w: 0.84, h: 0.12 }),
          align: 'left',
          fontSize: Math.round(Math.min(width, height) * 0.075),
          color: '#0f766e',
          fontFamily: 'serif',
        },
        {
          id: 't-body',
          kind: 'body',
          text: '今天和朋友一起来到海边，阳光晒在身上暖暖的，听着海浪，吹着海风，特别的治愈。',
          ...this.normBox({ x: 0.08, y: 0.26, w: 0.84, h: 0.07 }),
          align: 'left',
          fontSize: Math.round(Math.min(width, height) * 0.032),
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
    const escape = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const els = params.texts
      .filter((t) => t?.text?.trim())
      .map((t, i) => {
        const x = Math.round(t.x);
        const y = Math.round(t.y);
        const w = Math.round(t.w);
        const h = Math.round(t.h);
        const fontSize = Math.max(12, Math.round(t.fontSize ?? 28));
        const color = t.color || '#111827';
        const align = t.align || 'left';
        const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
        const xAnchor = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
        const yBase = y + fontSize; // 简化 baseline
        const family = t.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif';
        const weight = t.weight ?? 600;
        const transform = t.rotate
          ? ` transform="rotate(${t.rotate} ${x + w / 2} ${y + h / 2})"`
          : '';

        return `<text${transform} x="${xAnchor}" y="${yBase}" text-anchor="${anchor}" fill="${color}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}">${escape(t.text)}</text>`;
      })
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}">${els}</svg>`;
    return Buffer.from(svg);
  }

  private async renderPolaroidFrame(params: {
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

    // 白色相纸底
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

    // 简单阴影：复制一层黑色模糊并下移
    const shadow = await sharp(frame)
      .tint('#000000')
      .modulate({ brightness: 0.2 })
      .blur(12)
      .png()
      .toBuffer();

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

  private safeCompositeRect(params: {
    canvasW: number;
    canvasH: number;
    left: number;
    top: number;
    inputW: number;
    inputH: number;
  }): { left: number; top: number; w: number; h: number } | null {
    // 将输入图层裁剪到画布内，避免 sharp 抛出 "Image to composite must have same dimensions or smaller"
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

    // 返回裁剪后的尺寸以及在画布上的位置
    return { left: x0, top: y0, w, h };
  }

  private async cropToCanvas(params: {
    input: Buffer;
    canvasW: number;
    canvasH: number;
    left: number;
    top: number;
  }): Promise<{ input: Buffer; left: number; top: number } | null> {
    const meta = await sharp(params.input).metadata();
    const inW = meta.width ?? 0;
    const inH = meta.height ?? 0;

    const rect = this.safeCompositeRect({
      canvasW: params.canvasW,
      canvasH: params.canvasH,
      left: params.left,
      top: params.top,
      inputW: inW,
      inputH: inH,
    });
    if (!rect) return null;

    // 需要从输入图中裁剪掉超出画布的部分
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

  async generate(params: {
    prompt: string;
    style?: string;
    templateId?: string;
    files?: any[];
    width?: number;
    height?: number;
  }): Promise<CollageGenerateResult> {
    const width = params.width ?? 1024;
    const height = params.height ?? 1400;
    const size = `${width}x${height}`;

    const style = this.coerceStyle(params.style, params.templateId);

    // 上传图
    const photoFiles = (params.files || []).slice(0, 3);
    const photoCount = photoFiles.length;
    const photoPngs: Buffer[] = [];
    for (const f of photoFiles) {
      photoPngs.push(await this.fileToPngBuffer(f));
    }

    // 给 GPT-4o 做“元素提取/主题对齐/版式规划”参考：用 base64
    const imagesB64: string[] = [];
    for (const f of photoFiles) imagesB64.push(await this.fileToPngBase64(f));

    const fallbackLayout = this.defaultLayout({ width, height, photoCount });

    const plan = await this.openaiChatJson<CollagePlan>({
      model: this.config.get<string>('OPENAI_CHAT_MODEL') || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            '你是一个“手账拼贴版式”生成助手。目标是做出类似手账/杂志排版的拼贴：纸张背景、相纸/拍立得照片框、贴纸装饰、标题与正文。你必须输出严格 JSON，字段必须存在且可执行。\n' +
            '硬性约束：layout 中坐标与尺寸都用 0~1 的相对数值；photos 的 sourceIndex 必须在 [0, imageCount-1]；texts 的 kind 只能是 date/title/body；elements 2~8 个；禁止输出任何 JSON 之外的文字。\n' +
            '风格偏好（可参考）：留白充足、干净清爽、轻微阴影、胶带/贴纸点缀；禁止生成可读文字到背景/贴纸（文本由 layout.texts 渲染）。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                prompt: params.prompt,
                style,
                templateId: params.templateId,
                imageCount: photoCount,
                canvas: { width, height },
                example_layout_hint: {
                  top: 'date + big title',
                  middle: '1 big photo + 1-2 small photos',
                  decorations: '2-4 stickers around photos',
                },
                output_schema: {
                  style: 'string',
                  palette: ['string'],
                  backgroundPrompt: 'string',
                  elements: [{ id: 'string', kind: 'sticker|frame|decoration', prompt: 'string' }],
                  layout: {
                    canvas: { width: 'number', height: 'number' },
                    backgroundStyle: 'paper|stationery|minimal|poster',
                    photos: [
                      {
                        id: 'string',
                        sourceIndex: 'number',
                        x: '0~1',
                        y: '0~1',
                        w: '0~1',
                        h: '0~1',
                        rotate: 'number',
                        style: 'polaroid|tape|clean',
                        cornerRadius: 'number',
                        shadow: 'boolean',
                      },
                    ],
                    texts: [
                      {
                        id: 'string',
                        kind: 'date|title|body',
                        text: 'string',
                        x: '0~1',
                        y: '0~1',
                        w: '0~1',
                        h: '0~1',
                        align: 'left|center|right',
                        fontSize: 'number',
                        color: 'string',
                        fontFamily: 'sans|serif',
                        rotate: 'number',
                      },
                    ],
                    stickers: [{ elementId: 'string', x: '0~1', y: '0~1', w: '0~1', h: '0~1', rotate: 'number' }],
                  },
                  notes: 'string',
                },
              }),
            },
            ...imagesB64.map((b64) => ({
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${b64}` },
            })),
          ],
        },
      ],
    });

    // 校验/归一化 layout（兜底防崩）
    const layout: any = (() => {
      const l: any = (plan as any)?.layout;
      if (!l || !Array.isArray(l.photos) || !Array.isArray(l.texts)) return fallbackLayout;

      // canvas 兜底
      l.canvas = { width, height };

      // photos：限制 sourceIndex + box
      l.photos = (l.photos as any[])
        .filter(Boolean)
        .map((p: any, idx: number) => {
          const box = this.normBox(p);
          const sourceIndex = Math.max(0, Math.min(photoCount - 1, Number(p?.sourceIndex ?? idx)));
          return {
            id: String(p?.id || `p${idx}`),
            sourceIndex,
            ...box,
            rotate: Number(p?.rotate ?? 0),
            style: (p?.style === 'tape' || p?.style === 'clean' || p?.style === 'polaroid') ? p.style : 'polaroid',
            cornerRadius: Number.isFinite(Number(p?.cornerRadius)) ? Number(p.cornerRadius) : 12,
            shadow: Boolean(p?.shadow ?? true),
          };
        });

      // texts：box + 默认值
      l.texts = (l.texts as any[])
        .filter(Boolean)
        .map((t: any, idx: number) => {
          const box = this.normBox(t);
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
              ...this.normBox(s),
              rotate: Number(s?.rotate ?? 0),
            }))
            .filter((s: any) => s.elementId)
        : [];

      return l;
    })();

    // 背景：偏“纸张/手账底”
    const backgroundPrompt = [
      'A clean journal scrapbook paper background for a collage layout. Soft paper texture, subtle grain, gentle vignette, lots of whitespace.',
      `Theme: ${params.prompt}`,
      `Style: ${(plan as any)?.style || style}`,
      (plan as any)?.palette?.length ? `Palette: ${(plan as any).palette.join(', ')}` : undefined,
      `Background design: ${(plan as any)?.backgroundPrompt || ''}`,
      'Must NOT contain readable text, watermark, logo, or photo-like subjects. Background only.',
    ]
      .filter(Boolean)
      .join('\n');

    const backgroundBase64 = await this.openaiImageB64({
      prompt: backgroundPrompt,
      size,
      background: 'opaque',
    });

    // 贴纸素材
    const assets: Array<{ id: string; kind: string; base64: string; prompt: string }> = [];
    for (const el of ((plan as any)?.elements || []).slice(0, 8)) {
      const id = el.id || randomUUID();
      const elementPrompt = [
        'A single decorative sticker, isolated, centered, high quality, PNG, transparent background. Use simple illustration style, like scrapbook stickers.',
        `Kind: ${el.kind}`,
        `Style: ${(plan as any)?.style || style}`,
        (plan as any)?.palette?.length ? `Palette: ${(plan as any).palette.join(', ')}` : undefined,
        `Element: ${el.prompt}`,
        'No readable text, no watermark, no logo.',
      ]
        .filter(Boolean)
        .join('\n');

      const base64 = await this.openaiImageB64({
        prompt: elementPrompt,
        size: '1024x1024',
        background: 'transparent',
      });

      assets.push({ id, kind: el.kind, base64, prompt: el.prompt });
    }

    // 开始合成
    const bgBuf = Buffer.from(backgroundBase64, 'base64');
    let canvas = sharp(bgBuf).resize({ width, height, fit: 'cover' }).png();

    const composites: any[] = [];

    // 1) 照片层：渲染成拍立得/干净相框
    for (const p of layout.photos) {
      const src = photoPngs[p.sourceIndex];
      if (!src) continue;

      const px = Math.round(p.x * width);
      const py = Math.round(p.y * height);
      const pw = Math.round(p.w * width);
      const ph = Math.round(p.h * height);

      let rendered: Buffer;
      if (p.style === 'clean') {
        rendered = await sharp(src)
          .resize({ width: pw, height: ph, fit: 'cover' })
          .png()
          .toBuffer();
      } else {
        rendered = await this.renderPolaroidFrame({
          image: src,
          width: pw,
          height: ph,
          cornerRadius: Math.max(0, Math.round(p.cornerRadius ?? 12)),
          shadow: Boolean(p.shadow),
        });
      }

      // 旋转（旋转后尺寸会变大，可能超出画布）
      if (p.rotate) {
        rendered = await sharp(rendered)
          .rotate(p.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      }

      const clipped = await this.cropToCanvas({ input: rendered, canvasW: width, canvasH: height, left: px, top: py });
      if (clipped) composites.push(clipped);
    }

    // 2) 贴纸层：按 layout.stickers 放置；如果没给 stickers，就默认放 2 个
    const stickerPlacements = layout.stickers?.length
      ? layout.stickers
      : assets.slice(0, 2).map((a, idx) => ({
          elementId: a.id,
          ...this.normBox({ x: 0.75 - idx * 0.18, y: 0.2 + idx * 0.55, w: 0.16, h: 0.16 }),
          rotate: idx === 0 ? 10 : -8,
        }));

    for (const s of stickerPlacements) {
      const asset = assets.find((a) => a.id === s.elementId) || assets.find((a) => a.kind === 'sticker');
      if (!asset) continue;

      const px = Math.round(s.x * width);
      const py = Math.round(s.y * height);
      const pw = Math.round(s.w * width);
      const ph = Math.round(s.h * height);

      let buf = Buffer.from(asset.base64, 'base64');
      buf = await sharp(buf)
        .resize({ width: pw, height: ph, fit: 'inside' })
        .png()
        .toBuffer();

      if (s.rotate) {
        buf = await sharp(buf)
          .rotate(s.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      }

      const clipped = await this.cropToCanvas({ input: buf, canvasW: width, canvasH: height, left: px, top: py });
      if (clipped) composites.push(clipped);
    }

    // 3) 文本层：用 SVG overlay
    const textOverlays = layout.texts.map((t: any) => {
      const px = Math.round(t.x * width);
      const py = Math.round(t.y * height);
      const pw = Math.round(t.w * width);
      const ph = Math.round(t.h * height);

      const isTitle = t.kind === 'title';
      return {
        text: t.text,
        x: px,
        y: py,
        w: pw,
        h: ph,
        align: t.align,
        fontSize:
          t.fontSize ??
          (isTitle ? Math.round(Math.min(width, height) * 0.07) : Math.round(Math.min(width, height) * 0.032)),
        color: t.color ?? (isTitle ? '#0f766e' : '#111827'),
        fontFamily: t.fontFamily ?? (isTitle ? 'serif' : 'sans'),
        rotate: t.rotate,
        weight: isTitle ? 700 : 500,
      };
    });

    // 3) 文本层：用 SVG overlay（确保不超过画布）
    const textSvg = this.svgTextOverlay({ width, height, texts: textOverlays });
    const safeText = await this.cropToCanvas({ input: textSvg, canvasW: width, canvasH: height, left: 0, top: 0 });
    if (safeText) composites.push(safeText);

    const outBuf = await canvas
      .composite(composites)
      .png({ quality: 100 })
      .toBuffer();

    // 回写 layout 到 plan（确保返回值一致）
    (plan as any).layout = layout;
    (plan as any).backgroundPrompt = (plan as any).backgroundPrompt || backgroundPrompt;

    return {
      imageBase64: outBuf.toString('base64'),
      backgroundBase64,
      assets,
      plan,
    };
  }
}

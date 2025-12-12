"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiCollageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const sharp = require('sharp');
const ai_error_1 = require("../../common/ai-error");
const { ProxyAgent } = require('undici');
let OpenAiCollageService = class OpenAiCollageService {
    config;
    constructor(config) {
        this.config = config;
    }
    requireEnv(name) {
        const v = this.config.get(name);
        if (!v)
            throw new Error(`Missing ${name} in environment variables.`);
        return v;
    }
    clamp01(x) {
        if (!Number.isFinite(x))
            return 0;
        return Math.max(0, Math.min(1, x));
    }
    normBox(b) {
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
    async fileToPngBuffer(file) {
        const buf = file?.buffer;
        if (!buf)
            throw new Error('Invalid upload file buffer');
        return sharp(buf).rotate().png().toBuffer();
    }
    async fileToPngBase64(file) {
        const out = await this.fileToPngBuffer(file);
        return out.toString('base64');
    }
    getProxyDispatcher() {
        const proxy = this.config.get('OPENAI_PROXY') ||
            this.config.get('HTTPS_PROXY') ||
            this.config.get('https_proxy') ||
            this.config.get('HTTP_PROXY') ||
            this.config.get('http_proxy');
        if (!proxy)
            return undefined;
        return new ProxyAgent(proxy);
    }
    async withTimeout(promise, ms, label, code) {
        const timeoutMs = Math.max(1000, Math.floor(ms));
        let t;
        const timeout = new Promise((_, reject) => {
            t = setTimeout(() => {
                reject(new ai_error_1.AiError({ code, status: 504, message: `${label} timeout after ${timeoutMs}ms` }));
            }, timeoutMs);
        });
        try {
            return await Promise.race([promise, timeout]);
        }
        finally {
            clearTimeout(t);
        }
    }
    getChatTimeoutMs() {
        return Number(this.config.get('OPENAI_CHAT_TIMEOUT_MS') || 60000);
    }
    getImagesTimeoutMs() {
        return Number(this.config.get('OPENAI_IMAGES_TIMEOUT_MS') || 120000);
    }
    async openaiChatJson(params) {
        const apiKey = this.requireEnv('OPENAI_API_KEY');
        const dispatcher = this.getProxyDispatcher();
        let res;
        try {
            res = await this.withTimeout(fetch('https://api.openai.com/v1/chat/completions', {
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
            }), this.getChatTimeoutMs(), 'OpenAI chat', 'OPENAI_CHAT_TIMEOUT');
        }
        catch (e) {
            if (e?.name === 'AiError')
                throw e;
            const proxyHint = dispatcher ? ' (using proxy)' : ' (no proxy set)';
            throw new ai_error_1.AiError({
                code: 'OPENAI_CHAT_NETWORK',
                status: 502,
                message: `OpenAI chat network error${proxyHint}: ${e?.message || String(e)}`,
            });
        }
        const text = await res.text();
        if (!res.ok)
            throw new ai_error_1.AiError({
                code: 'OPENAI_CHAT_HTTP',
                status: 502,
                message: `OpenAI chat error: ${res.status} ${res.statusText}`,
                details: { status: res.status, statusText: res.statusText, body: text },
            });
        let json;
        try {
            json = JSON.parse(text);
        }
        catch {
            throw new ai_error_1.AiError({
                code: 'OPENAI_CHAT_HTTP',
                status: 502,
                message: 'OpenAI chat: invalid JSON response',
                details: { bodyHead: text.slice(0, 400) },
            });
        }
        const content = json?.choices?.[0]?.message?.content;
        if (typeof content !== 'string')
            throw new ai_error_1.AiError({ code: 'OPENAI_CHAT_HTTP', status: 502, message: 'OpenAI chat: empty response' });
        try {
            return JSON.parse(content);
        }
        catch {
            throw new ai_error_1.AiError({
                code: 'OPENAI_CHAT_HTTP',
                status: 502,
                message: 'OpenAI chat: model did not return a valid JSON object',
                details: { contentHead: String(content).slice(0, 800) },
            });
        }
    }
    normalizeOpenAiImageSize(params) {
        const model = (this.config.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1').toLowerCase();
        const w = Math.max(1, Math.floor(params.width));
        const h = Math.max(1, Math.floor(params.height));
        const ratio = w / h;
        const isSquare = ratio > 0.85 && ratio < 1.18;
        const isLandscape = ratio >= 1.18;
        if (model.includes('dall-e-3') || model.includes('dall-e-2') || model.includes('dalle')) {
            if (isSquare)
                return '1024x1024';
            if (isLandscape)
                return '1792x1024';
            return '1024x1792';
        }
        if (isSquare)
            return '1024x1024';
        if (isLandscape)
            return '1536x1024';
        return '1024x1536';
    }
    sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }
    shouldRetryOpenAiStatus(status) {
        return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
    }
    async fetchWithRetry(params) {
        const retries = Math.max(0, Math.min(6, params.retries ?? 3));
        const baseDelayMs = Math.max(100, params.baseDelayMs ?? 500);
        let lastErr;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const res = await fetch(params.url, {
                    ...(params.init || {}),
                    ...(params.dispatcher ? { dispatcher: params.dispatcher } : {}),
                });
                if (!this.shouldRetryOpenAiStatus(res.status) || attempt >= retries)
                    return res;
                await res.arrayBuffer().catch(() => undefined);
                const jitter = Math.floor(Math.random() * 200);
                const delay = Math.floor(baseDelayMs * Math.pow(2, attempt)) + jitter;
                await this.sleep(delay);
                continue;
            }
            catch (e) {
                lastErr = e;
                if (attempt >= retries)
                    throw e;
                const jitter = Math.floor(Math.random() * 200);
                const delay = Math.floor(baseDelayMs * Math.pow(2, attempt)) + jitter;
                await this.sleep(delay);
            }
        }
        throw lastErr || new Error('fetchWithRetry: unknown error');
    }
    async openaiImageB64(params) {
        const apiKey = this.requireEnv('OPENAI_API_KEY');
        const model = this.config.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
        const dispatcher = this.getProxyDispatcher();
        const normalizedSize = (() => {
            const m = /^\s*(\d+)\s*x\s*(\d+)\s*$/i.exec(params.size || '');
            if (!m)
                return '1024x1024';
            const w = Number(m[1]);
            const h = Number(m[2]);
            if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
                return '1024x1024';
            return this.normalizeOpenAiImageSize({ width: w, height: h });
        })();
        let res;
        try {
            res = await this.withTimeout(this.fetchWithRetry({
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
            }), this.getImagesTimeoutMs(), 'OpenAI images', 'OPENAI_IMAGES_TIMEOUT');
        }
        catch (e) {
            if (e?.name === 'AiError')
                throw e;
            const proxyHint = dispatcher ? ' (using proxy)' : ' (no proxy set)';
            throw new ai_error_1.AiError({
                code: 'OPENAI_IMAGES_NETWORK',
                status: 502,
                message: `OpenAI images network error${proxyHint}: ${e?.message || String(e)}`,
            });
        }
        const text = await res.text();
        if (!res.ok)
            throw new ai_error_1.AiError({
                code: 'OPENAI_IMAGES_HTTP',
                status: 502,
                message: `OpenAI images error: ${res.status} ${res.statusText} (model=${model}, size=${normalizedSize})`,
                details: { status: res.status, statusText: res.statusText, body: text },
            });
        if (!text.trim().startsWith('{')) {
            throw new ai_error_1.AiError({
                code: 'OPENAI_IMAGES_HTTP',
                status: 502,
                message: `OpenAI images: expected JSON response but got non-JSON body (status ${res.status})`,
                details: {
                    bodyHead: text
                        .slice(0, 200)
                        .replace(/\s+/g, ' '),
                },
            });
        }
        const json = JSON.parse(text);
        const b64 = json?.data?.[0]?.b64_json;
        if (b64)
            return b64;
        const url = json?.data?.[0]?.url;
        if (typeof url === 'string' && url.startsWith('http')) {
            let imgRes;
            try {
                imgRes = await this.withTimeout(fetch(url, {
                    ...(dispatcher ? { dispatcher } : {}),
                }), this.getImagesTimeoutMs(), 'OpenAI images download', 'OPENAI_IMAGES_TIMEOUT');
            }
            catch (e) {
                if (e?.name === 'AiError')
                    throw e;
                const proxyHint = dispatcher ? ' (using proxy)' : ' (no proxy set)';
                throw new ai_error_1.AiError({
                    code: 'OPENAI_IMAGES_NETWORK',
                    status: 502,
                    message: `OpenAI images download network error${proxyHint}: ${e?.message || String(e)}`,
                });
            }
            const arr = await imgRes.arrayBuffer();
            if (!imgRes.ok) {
                throw new ai_error_1.AiError({
                    code: 'OPENAI_IMAGES_HTTP',
                    status: 502,
                    message: `OpenAI images download error: ${imgRes.status} ${imgRes.statusText}`,
                    details: { bodyHead: Buffer.from(arr).toString('utf8').slice(0, 200) },
                });
            }
            return Buffer.from(arr).toString('base64');
        }
        throw new ai_error_1.AiError({
            code: 'OPENAI_IMAGES_HTTP',
            status: 502,
            message: 'OpenAI images: empty b64_json (and no url fallback)',
        });
    }
    coerceStyle(style, templateId) {
        if (style?.trim())
            return style.trim();
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
    defaultLayout(params) {
        const { width, height, photoCount } = params;
        const photos = [];
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
    svgTextOverlay(params) {
        const escape = (s) => String(s)
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
            return `<text${transform} x="${xAnchor}" y="${yBase}" text-anchor="${anchor}" fill="${color}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}">${escape(t.text)}</text>`;
        })
            .join('');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}">${els}</svg>`;
        return Buffer.from(svg);
    }
    async renderPolaroidFrame(params) {
        const photo = await sharp(params.image)
            .resize({ width: params.width, height: params.height, fit: 'cover' })
            .png()
            .toBuffer();
        const pad = Math.round(Math.min(params.width, params.height) * 0.08);
        const bottomPad = Math.round(pad * 1.8);
        const frameW = params.width + pad * 2;
        const frameH = params.height + pad + bottomPad;
        const roundedMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}"><rect x="0" y="0" width="${params.width}" height="${params.height}" rx="${params.cornerRadius}" ry="${params.cornerRadius}" fill="#fff"/></svg>`);
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
        if (!params.shadow)
            return frame;
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
    safeCompositeRect(params) {
        const left = Math.floor(params.left);
        const top = Math.floor(params.top);
        const inW = Math.floor(params.inputW);
        const inH = Math.floor(params.inputH);
        if (inW <= 0 || inH <= 0)
            return null;
        const canvasW = Math.floor(params.canvasW);
        const canvasH = Math.floor(params.canvasH);
        const x0 = Math.max(0, left);
        const y0 = Math.max(0, top);
        const x1 = Math.min(canvasW, left + inW);
        const y1 = Math.min(canvasH, top + inH);
        const w = x1 - x0;
        const h = y1 - y0;
        if (w <= 0 || h <= 0)
            return null;
        return { left: x0, top: y0, w, h };
    }
    async cropToCanvas(params) {
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
        if (!rect)
            return null;
        const extractLeft = rect.left - Math.floor(params.left);
        const extractTop = rect.top - Math.floor(params.top);
        const cropped = extractLeft === 0 && extractTop === 0 && rect.w === inW && rect.h === inH
            ? params.input
            : await sharp(params.input)
                .extract({ left: extractLeft, top: extractTop, width: rect.w, height: rect.h })
                .png()
                .toBuffer();
        return { input: cropped, left: rect.left, top: rect.top };
    }
    async generate(params) {
        const report = (stage, percent, message) => {
            try {
                params.onProgress?.({ stage, percent, message });
            }
            catch {
            }
        };
        try {
            report('init', 0.02, '开始处理输入');
            const width = params.width ?? 1024;
            const height = params.height ?? 1400;
            const size = `${width}x${height}`;
            const style = this.coerceStyle(params.style, params.templateId);
            report('prepare_images', 0.08, '读取并转换图片');
            const photoFiles = (params.files || []).slice(0, 3);
            const photoCount = photoFiles.length;
            const photoPngs = [];
            for (const f of photoFiles) {
                photoPngs.push(await this.fileToPngBuffer(f));
            }
            const imagesB64 = [];
            for (const f of photoFiles)
                imagesB64.push(await this.fileToPngBase64(f));
            const fallbackLayout = this.defaultLayout({ width, height, photoCount });
            const plan = await this.openaiChatJson({
                model: this.config.get('OPENAI_CHAT_MODEL') || 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个“手账拼贴版式”生成助手。目标是做出类似手账/杂志排版的拼贴：纸张背景、相纸/拍立得照片框、贴纸装饰、标题与正文。你必须输出严格 JSON，字段必须存在且可执行。\n' +
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
            const layout = (() => {
                const l = plan?.layout;
                if (!l || !Array.isArray(l.photos) || !Array.isArray(l.texts))
                    return fallbackLayout;
                l.canvas = { width, height };
                l.photos = l.photos
                    .filter(Boolean)
                    .map((p, idx) => {
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
                l.texts = l.texts
                    .filter(Boolean)
                    .map((t, idx) => {
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
                l.stickers = Array.isArray(l.stickers)
                    ? l.stickers
                        .filter(Boolean)
                        .map((s) => ({
                        elementId: String(s?.elementId || ''),
                        ...this.normBox(s),
                        rotate: Number(s?.rotate ?? 0),
                    }))
                        .filter((s) => s.elementId)
                    : [];
                return l;
            })();
            report('background', 0.42, '生成背景');
            const backgroundPrompt = [
                'A clean journal scrapbook paper background for a collage layout. Soft paper texture, subtle grain, gentle vignette, lots of whitespace.',
                `Theme: ${params.prompt}`,
                `Style: ${plan?.style || style}`,
                plan?.palette?.length ? `Palette: ${plan.palette.join(', ')}` : undefined,
                `Background design: ${plan?.backgroundPrompt || ''}`,
                'Must NOT contain readable text, watermark, logo, or photo-like subjects. Background only.',
            ]
                .filter(Boolean)
                .join('\n');
            const backgroundBase64 = await this.openaiImageB64({
                prompt: backgroundPrompt,
                size,
                background: 'opaque',
            });
            report('stickers', 0.62, '生成贴纸素材');
            const assets = [];
            for (const el of (plan?.elements || []).slice(0, 8)) {
                const id = el.id || (0, crypto_1.randomUUID)();
                const elementPrompt = [
                    'A single decorative sticker, isolated, centered, high quality, PNG, transparent background. Use simple illustration style, like scrapbook stickers.',
                    `Kind: ${el.kind}`,
                    `Style: ${plan?.style || style}`,
                    plan?.palette?.length ? `Palette: ${plan.palette.join(', ')}` : undefined,
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
            report('compose', 0.82, '合成图片');
            const bgBuf = Buffer.from(backgroundBase64, 'base64');
            let canvas = sharp(bgBuf).resize({ width, height, fit: 'cover' }).png();
            const composites = [];
            for (const p of layout.photos) {
                const src = photoPngs[p.sourceIndex];
                if (!src)
                    continue;
                const px = Math.round(p.x * width);
                const py = Math.round(p.y * height);
                const pw = Math.round(p.w * width);
                const ph = Math.round(p.h * height);
                let rendered;
                if (p.style === 'clean') {
                    rendered = await sharp(src)
                        .resize({ width: pw, height: ph, fit: 'cover' })
                        .png()
                        .toBuffer();
                }
                else {
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
                const clipped = await this.cropToCanvas({
                    input: rendered,
                    canvasW: width,
                    canvasH: height,
                    left: px,
                    top: py,
                });
                if (clipped)
                    composites.push(clipped);
            }
            const stickerPlacements = layout.stickers?.length
                ? layout.stickers
                : assets.slice(0, 2).map((a, idx) => ({
                    elementId: a.id,
                    ...this.normBox({ x: 0.75 - idx * 0.18, y: 0.2 + idx * 0.55, w: 0.16, h: 0.16 }),
                    rotate: idx === 0 ? 10 : -8,
                }));
            for (const s of stickerPlacements) {
                const asset = assets.find((a) => a.id === s.elementId) || assets.find((a) => a.kind === 'sticker');
                if (!asset)
                    continue;
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
                if (clipped)
                    composites.push(clipped);
            }
            const textOverlays = layout.texts.map((t) => {
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
                    fontSize: t.fontSize ??
                        (isTitle ? Math.round(Math.min(width, height) * 0.07) : Math.round(Math.min(width, height) * 0.032)),
                    color: t.color ?? (isTitle ? '#0f766e' : '#111827'),
                    fontFamily: t.fontFamily ?? (isTitle ? 'serif' : 'sans'),
                    rotate: t.rotate,
                    weight: isTitle ? 700 : 500,
                };
            });
            const textSvg = this.svgTextOverlay({ width, height, texts: textOverlays });
            const safeText = await this.cropToCanvas({ input: textSvg, canvasW: width, canvasH: height, left: 0, top: 0 });
            if (safeText)
                composites.push(safeText);
            const outBuf = await canvas
                .composite(composites)
                .png({ quality: 100 })
                .toBuffer();
            report('done', 1, '完成');
            plan.layout = layout;
            plan.backgroundPrompt = plan.backgroundPrompt || backgroundPrompt;
            return {
                imageBase64: outBuf.toString('base64'),
                backgroundBase64,
                assets,
                plan,
            };
        }
        catch (e) {
            if (e?.name === 'AiError')
                throw e;
            throw new ai_error_1.AiError({
                code: 'IMAGE_COMPOSE_ERROR',
                status: 500,
                message: e?.message || 'Image compose failed',
            });
        }
    }
};
exports.OpenAiCollageService = OpenAiCollageService;
exports.OpenAiCollageService = OpenAiCollageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAiCollageService);
//# sourceMappingURL=openai-collage.service.js.map
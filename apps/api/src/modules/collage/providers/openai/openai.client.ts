import { Injectable } from '@nestjs/common';

import { AiError } from '../../../../common/errors/ai-error';
import { OpenAiConfig } from './openai.config';

export type OpenAiChatJsonParams = {
  model?: string;
  messages: any[];
};

export type OpenAiImageB64Params = {
  prompt: string;
  size: string;
  background?: 'transparent' | 'opaque';
};

@Injectable()
export class OpenAiClient {
  constructor(private readonly cfg: OpenAiConfig) {}

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string, code: any) {
    const timeoutMs = Math.max(1000, Math.floor(ms));
    let t: any;
    const timeout = new Promise<never>((_, reject) => {
      t = setTimeout(() => {
        reject(new AiError({ code, status: 504, message: `${label} timeout after ${timeoutMs}ms` }));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(t);
    }
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

        // drain body to avoid socket leaks
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

  private normalizeOpenAiImageSize(params: { width: number; height: number; imageModel: string }): string {
    const model = (params.imageModel || 'gpt-image-1').toLowerCase();

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

    if (isSquare) return '1024x1024';
    if (isLandscape) return '1536x1024';
    return '1024x1536';
  }

  async chatJson<T>(params: OpenAiChatJsonParams): Promise<T> {
    const env = this.cfg.getEnv();
    const model = params.model || env.chatModel;

    let res: Response;
    try {
      res = await this.withTimeout(
        fetch(`${env.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${env.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: params.messages,
          }),
          ...(env.proxyDispatcher ? { dispatcher: env.proxyDispatcher } : {}),
        } as any),
        env.chatTimeoutMs,
        'OpenAI chat',
        'OPENAI_CHAT_TIMEOUT',
      );
    } catch (e: any) {
      if (e?.name === 'AiError') throw e;
      throw new AiError({
        code: 'OPENAI_CHAT_NETWORK',
        status: 502,
        message: `OpenAI chat network error: ${e?.message || String(e)}`,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      throw new AiError({
        code: 'OPENAI_CHAT_HTTP',
        status: 502,
        message: `OpenAI chat error: ${res.status} ${res.statusText}`,
        details: { status: res.status, statusText: res.statusText, body: text },
      });
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new AiError({
        code: 'OPENAI_CHAT_HTTP',
        status: 502,
        message: 'OpenAI chat: invalid JSON response',
        details: { bodyHead: text.slice(0, 400) },
      });
    }

    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AiError({ code: 'OPENAI_CHAT_HTTP', status: 502, message: 'OpenAI chat: empty response' });
    }

    try {
      return JSON.parse(content) as T;
    } catch {
      throw new AiError({
        code: 'OPENAI_CHAT_HTTP',
        status: 502,
        message: 'OpenAI chat: model did not return a valid JSON object',
        details: { contentHead: String(content).slice(0, 800) },
      });
    }
  }

  async imageB64(params: OpenAiImageB64Params): Promise<string> {
    const env = this.cfg.getEnv();
    const model = env.imageModel;

    const normalizedSize = (() => {
      const m = /^\s*(\d+)\s*x\s*(\d+)\s*$/i.exec(params.size || '');
      if (!m) return '1024x1024';
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '1024x1024';
      return this.normalizeOpenAiImageSize({ width: w, height: h, imageModel: model });
    })();

    let res: Response;
    try {
      res = await this.withTimeout(
        this.fetchWithRetry({
          url: `${env.baseUrl}/v1/images/generations`,
          dispatcher: env.proxyDispatcher,
          retries: 3,
          baseDelayMs: 600,
          init: {
            method: 'POST',
            headers: {
              authorization: `Bearer ${env.apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model,
              prompt: params.prompt,
              size: normalizedSize,
              n: 1,
            }),
          },
        }),
        env.imagesTimeoutMs,
        'OpenAI images',
        'OPENAI_IMAGES_TIMEOUT',
      );
    } catch (e: any) {
      if (e?.name === 'AiError') throw e;
      throw new AiError({
        code: 'OPENAI_IMAGES_NETWORK',
        status: 502,
        message: `OpenAI images network error: ${e?.message || String(e)}`,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      throw new AiError({
        code: 'OPENAI_IMAGES_HTTP',
        status: 502,
        message: `OpenAI images error: ${res.status} ${res.statusText} (model=${model}, size=${normalizedSize})`,
        details: { status: res.status, statusText: res.statusText, body: text },
      });
    }

    if (!text.trim().startsWith('{')) {
      throw new AiError({
        code: 'OPENAI_IMAGES_HTTP',
        status: 502,
        message: `OpenAI images: expected JSON response but got non-JSON body (status ${res.status})`,
        details: { bodyHead: text.slice(0, 200).replace(/\s+/g, ' ') },
      });
    }

    const json = JSON.parse(text);
    const b64 = json?.data?.[0]?.b64_json;
    if (b64) return b64;

    const url = json?.data?.[0]?.url;
    if (typeof url === 'string' && url.startsWith('http')) {
      let imgRes: Response;
      try {
        imgRes = await this.withTimeout(
          fetch(url, {
            ...(env.proxyDispatcher ? { dispatcher: env.proxyDispatcher } : {}),
          } as any),
          env.imagesTimeoutMs,
          'OpenAI images download',
          'OPENAI_IMAGES_TIMEOUT',
        );
      } catch (e: any) {
        if (e?.name === 'AiError') throw e;
        throw new AiError({
          code: 'OPENAI_IMAGES_NETWORK',
          status: 502,
          message: `OpenAI images download network error: ${e?.message || String(e)}`,
        });
      }

      const arr = await imgRes.arrayBuffer();
      if (!imgRes.ok) {
        throw new AiError({
          code: 'OPENAI_IMAGES_HTTP',
          status: 502,
          message: `OpenAI images download error: ${imgRes.status} ${imgRes.statusText}`,
          details: { bodyHead: Buffer.from(arr).toString('utf8').slice(0, 200) },
        });
      }
      return Buffer.from(arr).toString('base64');
    }

    throw new AiError({
      code: 'OPENAI_IMAGES_HTTP',
      status: 502,
      message: 'OpenAI images: empty b64_json (and no url fallback)',
    });
  }
}

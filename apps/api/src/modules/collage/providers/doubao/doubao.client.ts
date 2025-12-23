import { Injectable } from '@nestjs/common';

import { AiError } from '../../../../common/errors/ai-error';
import { AiProviderConfig } from '../ai-provider.config';

export type DoubaoImageB64Params = {
  prompt: string;
  size: string;
  seed?: number;
};

@Injectable()
export class DoubaoClient {
  constructor(private readonly ai: AiProviderConfig) {}

  // Doubao Seedream 4.5 要求：image size must be at least 3,686,400 pixels
  private static readonly MIN_IMAGE_PIXELS = 3_686_400;

  private normalizeSize(size: string) {
    const raw = String(size || '').trim();

    // 兼容官方示例这类枚举值："2K"（这里映射到一个保守的满足阈值的尺寸）
    if (raw.toUpperCase() === '2K') {
      return '1920x1920';
    }

    const m = raw.match(/^(\d+)x(\d+)$/i);
    if (!m) return raw;

    const w0 = Number(m[1]);
    const h0 = Number(m[2]);
    if (!Number.isFinite(w0) || !Number.isFinite(h0) || w0 <= 0 || h0 <= 0) return raw;

    const pixels = w0 * h0;
    if (pixels >= DoubaoClient.MIN_IMAGE_PIXELS) return `${Math.floor(w0)}x${Math.floor(h0)}`;

    const scale = Math.sqrt(DoubaoClient.MIN_IMAGE_PIXELS / pixels);
    const w = Math.ceil(w0 * scale);
    const h = Math.ceil(h0 * scale);
    return `${w}x${h}`;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
    const timeoutMs = Math.max(1000, Math.floor(ms));
    let t: any;
    const timeout = new Promise<never>((_, reject) => {
      t = setTimeout(() => {
        reject(new AiError({ code: 'UNKNOWN', status: 504, message: `${label} timeout after ${timeoutMs}ms` }));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(t);
    }
  }

  async imageB64(params: DoubaoImageB64Params): Promise<string> {
    const env = this.ai.getEnv('doubao');

    const url = `${env.baseUrl}/api/v3/images/generations`;

    const normalizedSize = this.normalizeSize(params.size);

    let res: Response;
    try {
      res = await this.withTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${env.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            // 官方示例：model + prompt + size + watermark
            model: env.imageModel || 'doubao-seedream-4-5-251128',
            prompt: params.prompt,
            size: normalizedSize,
            watermark: false,
            n: 1,
            ...(Number.isFinite(params.seed as any) ? { seed: params.seed } : {}),
          }),
          ...(env.proxyDispatcher ? { dispatcher: env.proxyDispatcher } : {}),
        } as any),
        env.imagesTimeoutMs ?? 120000,
        'Doubao images',
      );
    } catch (e: any) {
      if (e?.name === 'AiError') throw e;
      throw new AiError({
        code: 'UNKNOWN',
        status: 502,
        message: `Doubao images network error: ${e?.message || String(e)}`,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      // Ark 可能返回：{"code":"InvalidEndpointOrModel.NotFound", ...}
      let body: any = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }

      throw new AiError({
        code: body?.code || 'UNKNOWN',
        status: 502,
        message: body?.message || `Doubao images error: ${res.status} ${res.statusText}`,
        details: { status: res.status, statusText: res.statusText, body: body ?? text },
      });
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new AiError({
        code: 'UNKNOWN',
        status: 502,
        message: 'Doubao images: invalid JSON response',
        details: { bodyHead: text.slice(0, 400) },
      });
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (typeof b64 === 'string' && b64.length) return b64;

    const urlField = json?.data?.[0]?.url;
    if (typeof urlField === 'string' && urlField.startsWith('http')) {
      let imgRes: Response;
      try {
        imgRes = await this.withTimeout(
          fetch(urlField, {
            ...(env.proxyDispatcher ? { dispatcher: env.proxyDispatcher } : {}),
          } as any),
          env.imagesTimeoutMs ?? 120000,
          'Doubao images download',
        );
      } catch (e: any) {
        if (e?.name === 'AiError') throw e;
        throw new AiError({
          code: 'UNKNOWN',
          status: 502,
          message: `Doubao images download network error: ${e?.message || String(e)}`,
        });
      }

      const arr = await imgRes.arrayBuffer();
      if (!imgRes.ok) {
        throw new AiError({
          code: 'UNKNOWN',
          status: 502,
          message: `Doubao images download error: ${imgRes.status} ${imgRes.statusText}`,
          details: { bodyHead: Buffer.from(arr).toString('utf8').slice(0, 200) },
        });
      }
      return Buffer.from(arr).toString('base64');
    }

    throw new AiError({
      code: 'UNKNOWN',
      status: 502,
      message: 'Doubao images: empty b64_json (and no url fallback)',
      details: { response: json },
    });
  }
}

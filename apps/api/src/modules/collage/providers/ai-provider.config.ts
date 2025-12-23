import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const { ProxyAgent } = require('undici');

export type AiProviderId = 'openai' | 'doubao';

export type AiProviderEnv = {
  /** Bearer token / API Key */
  apiKey: string;
  /** Base URL of provider gateway */
  baseUrl: string;
  /** Optional HTTP proxy */
  proxyDispatcher?: any;

  /** Optional models/timeouts for specific capabilities */
  chatModel?: string;
  imageModel?: string;
  chatTimeoutMs?: number;
  imagesTimeoutMs?: number;
};

@Injectable()
export class AiProviderConfig {
  constructor(private readonly config: ConfigService) {}

  getDefaultProviderId(): AiProviderId {
    const v = (this.config.get<string>('COLLAGE_PROVIDER') || 'openai').toLowerCase();
    if (v !== 'openai' && v !== 'doubao') {
      throw new Error(`Invalid COLLAGE_PROVIDER: ${v}. Supported: openai, doubao`);
    }
    return v as AiProviderId;
  }

  private requireEnv(name: string) {
    const v = this.config.get<string>(name);
    if (!v) throw new Error(`Missing ${name} in environment variables.`);
    return v;
  }

  private upperProvider(id: AiProviderId) {
    return id.toUpperCase();
  }

  getEnv(id: AiProviderId): AiProviderEnv {
    const p = this.upperProvider(id);

    const proxy =
      this.config.get<string>(`AI_${p}_PROXY`) ||
      this.config.get<string>('AI_PROXY') ||
      this.config.get<string>('HTTPS_PROXY') ||
      this.config.get<string>('https_proxy') ||
      this.config.get<string>('HTTP_PROXY') ||
      this.config.get<string>('http_proxy');

    const chatTimeoutMsRaw = this.config.get<string>(`AI_${p}_CHAT_TIMEOUT_MS`);
    const imagesTimeoutMsRaw = this.config.get<string>(`AI_${p}_IMAGES_TIMEOUT_MS`);

    return {
      apiKey: this.requireEnv(`AI_${p}_API_KEY`),
      baseUrl: this.requireEnv(`AI_${p}_BASE_URL`),
      chatModel: this.config.get<string>(`AI_${p}_CHAT_MODEL`) || undefined,
      imageModel: this.config.get<string>(`AI_${p}_IMAGE_MODEL`) || undefined,
      chatTimeoutMs: Number(chatTimeoutMsRaw || 60000),
      imagesTimeoutMs: Number(imagesTimeoutMsRaw || 120000),
      proxyDispatcher: proxy ? new ProxyAgent(proxy) : undefined,
    };
  }
}

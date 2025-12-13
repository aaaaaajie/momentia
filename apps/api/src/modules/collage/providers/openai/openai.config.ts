import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const { ProxyAgent } = require('undici');

export type OpenAiEnv = {
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  imageModel: string;
  chatTimeoutMs: number;
  imagesTimeoutMs: number;
  proxyDispatcher?: any;
};

@Injectable()
export class OpenAiConfig {
  constructor(private readonly config: ConfigService) {}

  private requireEnv(name: string) {
    const v = this.config.get<string>(name);
    if (!v) throw new Error(`Missing ${name} in environment variables.`);
    return v;
  }

  getEnv(): OpenAiEnv {
    const proxy =
      this.config.get<string>('OPENAI_PROXY') ||
      this.config.get<string>('HTTPS_PROXY') ||
      this.config.get<string>('https_proxy') ||
      this.config.get<string>('HTTP_PROXY') ||
      this.config.get<string>('http_proxy');

    return {
      apiKey: this.requireEnv('OPENAI_API_KEY'),
      baseUrl: this.config.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com',
      chatModel: this.config.get<string>('OPENAI_CHAT_MODEL') || 'gpt-4o',
      imageModel: this.config.get<string>('OPENAI_IMAGE_MODEL') || 'gpt-image-1',
      chatTimeoutMs: Number(this.config.get<string>('OPENAI_CHAT_TIMEOUT_MS') || 60000),
      imagesTimeoutMs: Number(this.config.get<string>('OPENAI_IMAGES_TIMEOUT_MS') || 120000),
      proxyDispatcher: proxy ? new ProxyAgent(proxy) : undefined,
    };
  }
}

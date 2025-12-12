import { Injectable } from '@nestjs/common';

/**
 * 已弃用：旧的 AiService（provider 聚合 + compose planner + image provider）链路已下线。
 * 现在请使用 OpenAiCollageService（/ai/compose）完成端到端生成。
 */
@Injectable()
export class AiService {
  getProviders(): never {
    throw new Error('AiService is deprecated. Use OpenAiCollageService instead.');
  }

  async generateImage(): Promise<never> {
    throw new Error('AiService is deprecated. Use OpenAiCollageService instead.');
  }
}

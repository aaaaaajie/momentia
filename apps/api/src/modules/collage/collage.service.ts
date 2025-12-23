import { Inject, Injectable } from '@nestjs/common';

import type { CollageGenerateParams, CollageGenerateResult } from './collage.types';
import { AiError } from '../../common/errors/ai-error';
import { AiProviderConfig, type AiProviderId } from './providers/ai-provider.config';
import { COLLAGE_PROVIDERS } from './providers/provider.token';
import { CollageProvider } from './providers/provider.contract';

@Injectable()
export class CollageService {
  constructor(
    @Inject(COLLAGE_PROVIDERS)
    private readonly providers: CollageProvider[],
    private readonly ai: AiProviderConfig,
  ) {}

  private pickProvider(id?: string): CollageProvider {
    const envDefault: AiProviderId = this.ai.getDefaultProviderId();
    const key = (id || envDefault || 'openai').toLowerCase();
    const p = this.providers.find((x) => x.id.toLowerCase() === key);
    if (!p) {
      const supported = this.providers.map((x) => x.id).sort();
      throw new AiError({
        code: 'UNSUPPORTED_PROVIDER',
        status: 400,
        message: `Unsupported collage provider: ${id || envDefault}. Supported: ${supported.join(', ')}`,
        details: { requested: id || envDefault, supported },
      });
    }
    return p;
  }

  async generate(params: CollageGenerateParams & { provider?: string }): Promise<CollageGenerateResult> {
    return this.pickProvider(params.provider).generate(params);
  }
}

import { Inject, Injectable } from '@nestjs/common';

import type { CollageGenerateResult } from './collage.types';
import { COLLAGE_PROVIDERS } from './core/collage-provider.token';
import type { CollageGenerateParams, CollageProvider } from './core/collage.provider';

@Injectable()
export class CollageService {
  constructor(
    @Inject(COLLAGE_PROVIDERS)
    private readonly providers: CollageProvider[],
  ) {}

  private pickProvider(id?: string): CollageProvider {
    const key = (id || 'openai').toLowerCase();
    const p = this.providers.find((x) => x.id.toLowerCase() === key);
    if (!p) {
      const supported = this.providers.map((x) => x.id).sort();
      throw new Error(`Unsupported collage provider: ${id}. Supported: ${supported.join(', ')}`);
    }
    return p;
  }

  async generate(params: CollageGenerateParams & { provider?: string }): Promise<CollageGenerateResult> {
    return this.pickProvider(params.provider).generate(params);
  }
}

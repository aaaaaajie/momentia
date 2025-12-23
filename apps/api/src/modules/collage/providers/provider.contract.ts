import type { CollageGenerateParams, CollageGenerateResult } from '../collage.types';

export interface CollageProvider {
  /** provider id, e.g. 'openai', 'jimeng', 'baidu', 'doubao' */
  readonly id: string;

  generate(params: CollageGenerateParams): Promise<CollageGenerateResult>;
}

import type { CollageGenerateResult } from '../collage.types';

export type CollageGenerateParams = {
  prompt: string;
  style?: string;
  templateId?: string;
  files?: any[];
  width?: number;
  height?: number;
  onProgress?: (e: { stage: string; percent: number; message?: string }) => void;
};

export interface CollageProvider {
  /** provider id, e.g. 'openai', 'jimeng', 'baidu', 'doubao' */
  readonly id: string;

  generate(params: CollageGenerateParams): Promise<CollageGenerateResult>;
}

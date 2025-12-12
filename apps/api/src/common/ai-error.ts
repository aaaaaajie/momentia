export type AiErrorCode =
  | 'BAD_REQUEST'
  | 'OPENAI_CHAT_TIMEOUT'
  | 'OPENAI_CHAT_NETWORK'
  | 'OPENAI_CHAT_HTTP'
  | 'OPENAI_IMAGES_TIMEOUT'
  | 'OPENAI_IMAGES_NETWORK'
  | 'OPENAI_IMAGES_HTTP'
  | 'IMAGE_COMPOSE_ERROR'
  | 'UNKNOWN';

export class AiError extends Error {
  code: AiErrorCode;
  status: number;
  details?: any;

  constructor(params: { code: AiErrorCode; message: string; status?: number; details?: any }) {
    super(params.message);
    this.name = 'AiError';
    this.code = params.code;
    this.status = params.status ?? 500;
    this.details = params.details;
  }
}

export function isAiError(e: any): e is AiError {
  return e && typeof e === 'object' && e.name === 'AiError' && typeof e.code === 'string';
}

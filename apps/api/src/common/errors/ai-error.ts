export type AiErrorCode =
  | 'BAD_REQUEST'
  | 'UNSUPPORTED_PROVIDER'
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
  details?: unknown;

  constructor(params: {
    code: AiErrorCode;
    message: string;
    status?: number;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'AiError';
    this.code = params.code;
    this.status = params.status ?? 500;
    this.details = params.details;
  }
}

export function isAiError(e: unknown): e is AiError {
  return (
    !!e &&
    typeof e === 'object' &&
    (e as any).name === 'AiError' &&
    typeof (e as any).code === 'string'
  );
}

export function canRetryByCode(code?: string) {
  const c = String(code || '').toUpperCase();
  return (
    c === 'OPENAI_IMAGES_NETWORK' ||
    c === 'OPENAI_IMAGES_TIMEOUT' ||
    c === 'OPENAI_CHAT_NETWORK' ||
    c === 'OPENAI_CHAT_TIMEOUT'
  );
}

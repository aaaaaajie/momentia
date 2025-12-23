export function canRetryByCode(code?: string) {
  // 策略 A：任何错误都允许在页面上重试。
  // 这里保留 code 入参是为了兼容既有调用，不再做白名单过滤。
  void code;
  return true;
}

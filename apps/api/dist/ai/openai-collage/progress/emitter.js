"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseWrite = sseWrite;
exports.sseHeaders = sseHeaders;
function sseWrite(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
function sseHeaders(res) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
}
//# sourceMappingURL=emitter.js.map
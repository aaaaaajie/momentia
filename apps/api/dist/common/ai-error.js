"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiError = void 0;
exports.isAiError = isAiError;
class AiError extends Error {
    code;
    status;
    details;
    constructor(params) {
        super(params.message);
        this.name = 'AiError';
        this.code = params.code;
        this.status = params.status ?? 500;
        this.details = params.details;
    }
}
exports.AiError = AiError;
function isAiError(e) {
    return e && typeof e === 'object' && e.name === 'AiError' && typeof e.code === 'string';
}
//# sourceMappingURL=ai-error.js.map
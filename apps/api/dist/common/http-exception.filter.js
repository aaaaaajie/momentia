"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalHttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const ai_error_1 = require("./ai-error");
let GlobalHttpExceptionFilter = class GlobalHttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        if ((0, ai_error_1.isAiError)(exception)) {
            const body = {
                statusCode: exception.status,
                code: exception.code,
                message: exception.message,
                details: exception.details,
            };
            return res.status(exception.status).json(body);
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();
            const message = (typeof response === 'string' ? response : response?.message) || exception.message;
            const body = {
                statusCode: status,
                code: response?.code || 'HTTP_EXCEPTION',
                message,
                details: typeof response === 'object' ? response : undefined,
            };
            return res.status(status).json(body);
        }
        const status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const body = {
            statusCode: status,
            code: 'INTERNAL_SERVER_ERROR',
            message: exception?.message || 'Internal server error',
        };
        return res.status(status).json(body);
    }
};
exports.GlobalHttpExceptionFilter = GlobalHttpExceptionFilter;
exports.GlobalHttpExceptionFilter = GlobalHttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalHttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map
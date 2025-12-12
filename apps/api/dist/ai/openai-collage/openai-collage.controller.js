"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiCollageController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const openai_collage_service_1 = require("./openai-collage.service");
const openai_collage_dto_1 = require("./openai-collage.dto");
const emitter_1 = require("./progress/emitter");
let OpenAiCollageController = class OpenAiCollageController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async compose(files, body) {
        return this.svc.generate({
            prompt: body.prompt,
            style: body.style,
            templateId: body.templateId,
            files,
            width: body.width,
            height: body.height,
        });
    }
    async composeStream(files, body, res) {
        (0, emitter_1.sseHeaders)(res);
        (0, emitter_1.sseWrite)(res, 'progress', { stage: 'accepted', percent: 0, message: '已接收请求' });
        try {
            const result = await this.svc.generate({
                prompt: body.prompt,
                style: body.style,
                templateId: body.templateId,
                files,
                width: body.width,
                height: body.height,
                onProgress: (e) => (0, emitter_1.sseWrite)(res, 'progress', e),
            });
            (0, emitter_1.sseWrite)(res, 'done', result);
            res.end();
        }
        catch (e) {
            (0, emitter_1.sseWrite)(res, 'error', {
                code: e?.code || 'UNKNOWN',
                message: e?.message || 'Unknown error',
                details: e?.details,
                statusCode: e?.status || 500,
            });
            res.end();
        }
    }
};
exports.OpenAiCollageController = OpenAiCollageController;
__decorate([
    (0, common_1.Post)('compose'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 3)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, openai_collage_dto_1.GenerateCollageDto]),
    __metadata("design:returntype", Promise)
], OpenAiCollageController.prototype, "compose", null);
__decorate([
    (0, common_1.Post)('compose/stream'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 3)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, openai_collage_dto_1.GenerateCollageDto, Object]),
    __metadata("design:returntype", Promise)
], OpenAiCollageController.prototype, "composeStream", null);
exports.OpenAiCollageController = OpenAiCollageController = __decorate([
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [openai_collage_service_1.OpenAiCollageService])
], OpenAiCollageController);
//# sourceMappingURL=openai-collage.controller.js.map
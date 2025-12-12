"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiCollageModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_collage_controller_1 = require("./openai-collage.controller");
const openai_collage_service_1 = require("./openai-collage.service");
let OpenAiCollageModule = class OpenAiCollageModule {
};
exports.OpenAiCollageModule = OpenAiCollageModule;
exports.OpenAiCollageModule = OpenAiCollageModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        controllers: [openai_collage_controller_1.OpenAiCollageController],
        providers: [openai_collage_service_1.OpenAiCollageService],
        exports: [openai_collage_service_1.OpenAiCollageService],
    })
], OpenAiCollageModule);
//# sourceMappingURL=openai-collage.module.js.map
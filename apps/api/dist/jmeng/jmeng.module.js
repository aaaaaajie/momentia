"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JmengModule = void 0;
const common_1 = require("@nestjs/common");
const jmeng_service_1 = require("./jmeng.service");
const jmeng_controller_1 = require("./jmeng.controller");
const ai_module_1 = require("../ai/ai.module");
const jmeng_provider_1 = require("../ai/providers/jmeng.provider");
let JmengModule = class JmengModule {
};
exports.JmengModule = JmengModule;
exports.JmengModule = JmengModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AiModule],
        controllers: [jmeng_controller_1.JmengController],
        providers: [jmeng_provider_1.JmengProvider, jmeng_service_1.JmengService],
        exports: [jmeng_service_1.JmengService],
    })
], JmengModule);
//# sourceMappingURL=jmeng.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sequelize_module_1 = require("./db/sequelize.module");
const health_module_1 = require("./health/health.module");
const notes_module_1 = require("./notes/notes.module");
const openai_collage_module_1 = require("./ai/openai-collage/openai-collage.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '../../.env'],
            }),
            sequelize_module_1.SequelizeModule,
            health_module_1.HealthModule,
            notes_module_1.NotesModule,
            openai_collage_module_1.OpenAiCollageModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequelizeModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sequelize_typescript_1 = require("sequelize-typescript");
const note_model_1 = require("../notes/note.model");
let SequelizeModule = class SequelizeModule {
};
exports.SequelizeModule = SequelizeModule;
exports.SequelizeModule = SequelizeModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: sequelize_typescript_1.Sequelize,
                inject: [config_1.ConfigService],
                useFactory: async (config) => {
                    const sequelize = new sequelize_typescript_1.Sequelize({
                        dialect: 'postgres',
                        host: config.get('DB_HOST', 'localhost'),
                        port: Number(config.get('DB_PORT', '5432')),
                        username: config.get('DB_USER', 'momentia'),
                        password: config.get('DB_PASSWORD', 'momentia'),
                        database: config.get('DB_NAME', 'momentia'),
                        logging: config.get('DB_LOGGING', 'false') === 'true' ? console.log : false,
                        models: [note_model_1.NoteModel],
                    });
                    await sequelize.authenticate();
                    await sequelize.sync();
                    return sequelize;
                },
            },
        ],
        exports: [sequelize_typescript_1.Sequelize],
    })
], SequelizeModule);
//# sourceMappingURL=sequelize.module.js.map
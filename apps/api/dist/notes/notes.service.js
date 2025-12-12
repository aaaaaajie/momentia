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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesService = void 0;
const common_1 = require("@nestjs/common");
const sequelize_typescript_1 = require("sequelize-typescript");
const note_model_1 = require("./note.model");
let NotesService = class NotesService {
    sequelize;
    constructor(sequelize) {
        this.sequelize = sequelize;
    }
    async list() {
        return note_model_1.NoteModel.findAll({ order: [['createdAt', 'DESC']] });
    }
    async get(id) {
        const note = await note_model_1.NoteModel.findByPk(id);
        if (!note)
            throw new common_1.NotFoundException('note not found');
        return note;
    }
    async create(dto) {
        const note = note_model_1.NoteModel.build({
            title: dto.title,
            content: dto.content ?? null,
        });
        await note.save();
        return note;
    }
    async update(id, dto) {
        const note = await this.get(id);
        await note.update({
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.content !== undefined ? { content: dto.content } : {}),
        });
        return note;
    }
};
exports.NotesService = NotesService;
exports.NotesService = NotesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sequelize_typescript_1.Sequelize])
], NotesService);
//# sourceMappingURL=notes.service.js.map
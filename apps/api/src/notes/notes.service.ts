import { Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { NoteModel } from './note.model';
import { CreateNoteDto, UpdateNoteDto } from './dto';

@Injectable()
export class NotesService {
  constructor(private readonly sequelize: Sequelize) {}

  async list() {
    return NoteModel.findAll({ order: [['createdAt', 'DESC']] });
  }

  async get(id: string) {
    const note = await NoteModel.findByPk(id);
    if (!note) throw new NotFoundException('note not found');
    return note;
  }

  async create(dto: CreateNoteDto) {
    const note = NoteModel.build({
      title: dto.title,
      content: dto.content ?? null,
    } as any);
    await note.save();
    return note;
  }

  async update(id: string, dto: UpdateNoteDto) {
    const note = await this.get(id);
    await note.update({
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.content !== undefined ? { content: dto.content } : {}),
    });
    return note;
  }
}

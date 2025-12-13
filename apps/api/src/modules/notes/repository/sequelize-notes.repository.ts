import { Injectable } from '@nestjs/common';
import type { CreateNoteDto, UpdateNoteDto } from '../dto';
import { NoteModel } from '../note.model';
import type { NotesRepository } from './notes.repository';

@Injectable()
export class SequelizeNotesRepository implements NotesRepository {
  async list(): Promise<NoteModel[]> {
    return NoteModel.findAll({ order: [['createdAt', 'DESC']] });
  }

  async get(id: string): Promise<NoteModel | null> {
    return NoteModel.findByPk(id);
  }

  async create(dto: CreateNoteDto): Promise<NoteModel> {
    const note = NoteModel.build({
      title: dto.title,
      content: dto.content ?? null,
    } as any);
    await note.save();
    return note;
  }

  async update(id: string, dto: UpdateNoteDto): Promise<NoteModel> {
    const note = await NoteModel.findByPk(id);
    if (!note) throw new Error('note not found');

    await note.update({
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.content !== undefined ? { content: dto.content } : {}),
    });

    return note;
  }
}

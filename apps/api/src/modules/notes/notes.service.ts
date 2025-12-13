import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto, UpdateNoteDto } from './dto';
import { NOTES_REPOSITORY, NotesRepository } from './repository/notes.repository';

@Injectable()
export class NotesService {
  constructor(
    @Inject(NOTES_REPOSITORY)
    private readonly repo: NotesRepository,
  ) {}

  async list() {
    return this.repo.list();
  }

  async get(id: string) {
    const note = await this.repo.get(id);
    if (!note) throw new NotFoundException('note not found');
    return note;
  }

  async create(dto: CreateNoteDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateNoteDto) {
    // 保持应用层语义：不存在则 404
    await this.get(id);
    return this.repo.update(id, dto);
  }
}

import type { CreateNoteDto, UpdateNoteDto } from '../dto';
import type { NoteModel } from '../note.model';

export interface NotesRepository {
  list(): Promise<NoteModel[]>;
  get(id: string): Promise<NoteModel | null>;
  create(dto: CreateNoteDto): Promise<NoteModel>;
  update(id: string, dto: UpdateNoteDto): Promise<NoteModel>;
}

export const NOTES_REPOSITORY = Symbol('NOTES_REPOSITORY');

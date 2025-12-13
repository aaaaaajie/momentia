import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NOTES_REPOSITORY } from './repository/notes.repository';
import { SequelizeNotesRepository } from './repository/sequelize-notes.repository';

@Module({
  controllers: [NotesController],
  providers: [
    NotesService,
    SequelizeNotesRepository,
    {
      provide: NOTES_REPOSITORY,
      useExisting: SequelizeNotesRepository,
    },
  ],
})
export class NotesModule {}

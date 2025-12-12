import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list() {
    return this.notes.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.notes.get(id);
  }

  @Post()
  create(@Body() dto: CreateNoteDto) {
    return this.notes.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.notes.update(id, dto);
  }
}

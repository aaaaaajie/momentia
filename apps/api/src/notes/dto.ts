export type CreateNoteDto = {
  title: string;
  content?: string;
};

export type UpdateNoteDto = {
  title?: string;
  content?: string;
};

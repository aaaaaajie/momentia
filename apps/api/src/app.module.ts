import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from './db/sequelize.module';
import { HealthModule } from './health/health.module';
import { NotesModule } from './notes/notes.module';
import { OpenAiCollageModule } from './ai/openai-collage/openai-collage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    SequelizeModule,
    HealthModule,
    NotesModule,

    OpenAiCollageModule,
  ],
})
export class AppModule {}

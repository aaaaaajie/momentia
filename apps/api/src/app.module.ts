import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from './db/sequelize.module';
import { HealthModule } from './health/health.module';
import { NotesModule } from './modules/notes/notes.module';
import { CollageModule } from './modules/collage/collage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    // SequelizeModule,
    HealthModule,
    NotesModule,

    CollageModule,
  ],
})
export class AppModule {}

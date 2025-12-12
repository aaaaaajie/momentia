import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { NoteModel } from '../notes/note.model';

@Global()
@Module({
  providers: [
    {
      provide: Sequelize,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const sequelize = new Sequelize({
          dialect: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number(config.get<string>('DB_PORT', '5432')),
          username: config.get<string>('DB_USER', 'momentia'),
          password: config.get<string>('DB_PASSWORD', 'momentia'),
          database: config.get<string>('DB_NAME', 'momentia'),
          logging: config.get<string>('DB_LOGGING', 'false') === 'true' ? console.log : false,
          models: [NoteModel],
        });

        await sequelize.authenticate();
        // 简化：开发阶段自动同步。生产建议改为 migrations。
        await sequelize.sync();

        return sequelize;
      },
    },
  ],
  exports: [Sequelize],
})
export class SequelizeModule {}

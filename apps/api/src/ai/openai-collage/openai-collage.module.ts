import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiCollageController } from './openai-collage.controller';
import { OpenAiCollageService } from './openai-collage.service';

@Module({
  imports: [ConfigModule],
  controllers: [OpenAiCollageController],
  providers: [OpenAiCollageService],
  exports: [OpenAiCollageService],
})
export class OpenAiCollageModule {}

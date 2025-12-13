import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CollageController } from './collage.controller';
import { CollageService } from './collage.service';

import { COLLAGE_PROVIDERS } from './core/collage-provider.token';
import { OpenAiCollageProvider } from './providers/openai/openai-collage.provider';
import { OpenAiClient } from './providers/openai/openai.client';
import { OpenAiConfig } from './providers/openai/openai.config';

@Module({
  imports: [ConfigModule],
  controllers: [CollageController],
  providers: [
    CollageService,
    OpenAiConfig,
    OpenAiClient,
    OpenAiCollageProvider,
    {
      provide: COLLAGE_PROVIDERS,
      useFactory: (openai: OpenAiCollageProvider) => [openai],
      inject: [OpenAiCollageProvider],
    },
  ],
  exports: [CollageService],
})
export class CollageModule {}

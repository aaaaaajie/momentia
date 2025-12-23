import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CollageController } from './collage.controller';
import { CollageService } from './collage.service';

import { OpenAiCollageProvider } from './providers/openai/openai-collage.provider';
import { OpenAiClient } from './providers/openai/openai.client';
import { DoubaoCollageProvider } from './providers/doubao/doubao.provider';
import { DoubaoClient } from './providers/doubao/doubao.client';
import { AiProviderConfig } from './providers/ai-provider.config';
import { COLLAGE_PROVIDERS } from './providers/provider.token';

@Module({
  imports: [ConfigModule],
  controllers: [CollageController],
  providers: [
    CollageService,

    AiProviderConfig,

    OpenAiClient,
    OpenAiCollageProvider,

    DoubaoClient,
    DoubaoCollageProvider,

    {
      provide: COLLAGE_PROVIDERS,
      useFactory: (openai: OpenAiCollageProvider, doubao: DoubaoCollageProvider) => [openai, doubao],
      inject: [OpenAiCollageProvider, DoubaoCollageProvider],
    },
  ],
  exports: [CollageService],
})
export class CollageModule {}

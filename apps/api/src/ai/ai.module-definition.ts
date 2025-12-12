import { Module } from '@nestjs/common';

/**
 * 已弃用：旧的 AiModule(register + providers 聚合) 链路已删除。
 * 当前项目仅保留 OpenAiCollageModule（/ai/compose）。
 */
@Module({})
export class AiModule {}

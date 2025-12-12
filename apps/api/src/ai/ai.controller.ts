import { Controller } from '@nestjs/common';

/**
 * 已弃用：旧的 /ai2/* 链路已移除。
 * 请使用 /ai/compose（OpenAiCollageController）。
 */
@Controller('ai2')
export class AiController {}

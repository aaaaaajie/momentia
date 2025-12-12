import { Body, Controller, Post, UploadedFiles, Res, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OpenAiCollageService } from './openai-collage.service';
import { GenerateCollageDto } from './openai-collage.dto';
import { Response } from 'express';

import { sseHeaders, sseWrite } from './progress/emitter';

@Controller('ai')
export class OpenAiCollageController {
  constructor(private readonly svc: OpenAiCollageService) {}

  /**
   * 最简闭环：multipart/form-data
   * - files: 0~3 张图片（可选）
   * - prompt/style/templateId/width/height: 字段
   */
  @Post('compose')
  @UseInterceptors(FilesInterceptor('files', 3))
  async compose(@UploadedFiles() files: any[], @Body() body: GenerateCollageDto) {
    return this.svc.generate({
      prompt: body.prompt,
      style: body.style,
      templateId: body.templateId,
      files,
      width: body.width,
      height: body.height,
    });
  }

  @Post('compose/stream')
  @UseInterceptors(FilesInterceptor('files', 3))
  async composeStream(
    @UploadedFiles() files: any[],
    @Body() body: GenerateCollageDto,
    @Res() res: Response,
  ) {
    sseHeaders(res);
    sseWrite(res, 'progress', { stage: 'accepted', percent: 0, message: '已接收请求' });

    try {
      const result = await this.svc.generate({
        prompt: body.prompt,
        style: body.style,
        templateId: body.templateId,
        files,
        width: body.width,
        height: body.height,
        onProgress: (e) => sseWrite(res, 'progress', e),
      });

      sseWrite(res, 'done', result);
      res.end();
    } catch (e: any) {
      // 全局 filter 不会接管已经开始的 SSE 流，所以这里手动输出
      sseWrite(res, 'error', {
        code: e?.code || 'UNKNOWN',
        message: e?.message || 'Unknown error',
        details: e?.details,
        statusCode: e?.status || 500,
      });
      res.end();
    }
  }
}

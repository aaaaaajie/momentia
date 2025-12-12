import { Body, Controller, Post, UploadedFiles, Res, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CollageService } from './collage.service';
import { GenerateCollageDto } from './collage.dto';
import { Response } from 'express';

import { sseHeaders, sseWrite } from './progress/emitter';

@Controller('ai')
export class CollageController {
  constructor(private readonly svc: CollageService) {}

  @Post('compose')
  @UseInterceptors(FilesInterceptor('files', 3))
  async compose(@UploadedFiles() files: any[], @Body() body: GenerateCollageDto) {
    return this.svc.generate({
      provider: body.provider,
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
        provider: body.provider,
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

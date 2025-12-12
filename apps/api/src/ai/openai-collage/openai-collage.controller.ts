import { Body, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OpenAiCollageService } from './openai-collage.service';
import { GenerateCollageDto } from './openai-collage.dto';

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
}

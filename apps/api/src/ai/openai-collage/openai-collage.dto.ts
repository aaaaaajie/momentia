import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateCollageDto {
  /**
   * 兼容旧前端字段：provider/mode
   * - ValidationPipe 开启了 forbidNonWhitelisted，所以这里必须显式声明
   */
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsIn(['compose', 'generate'])
  mode?: 'compose' | 'generate';

  /** 主题/描述 */
  @IsString()
  prompt!: string;

  /** 5 种内置风格之一（也允许用户传自定义文本） */
  @IsOptional()
  @IsString()
  style?: string;

  /** 内置模板 id（可选） */
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsInt()
  @Min(256)
  @Max(2048)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(256)
  @Max(2048)
  height?: number;
}

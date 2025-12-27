import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateCollageDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsIn(['compose', 'generate'])
  mode?: 'compose' | 'generate';

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  // 允许前端直接传入要渲染到图片里的文案
  @IsOptional()
  @IsString()
  dateText?: string;

  @IsOptional()
  @IsString()
  titleText?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

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

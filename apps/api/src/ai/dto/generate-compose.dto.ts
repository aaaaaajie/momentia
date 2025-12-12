/**
 * 已弃用：旧的 /ai2/compose1 DTO。
 * 现在请使用 /ai/compose 的 `GenerateCollageDto`。
 */
export {};

import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateComposeDto {
  @IsString()
  prompt!: string;

  /** base64/dataURL/url */
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  background?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  decorations?: string; // 逗号分隔，multipart 里更简单

  @IsOptional()
  @IsIn(['compose', 'generate'])
  mode?: 'compose' | 'generate';

  @IsOptional()
  @IsInt()
  @Min(64)
  @Max(4096)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(64)
  @Max(4096)
  height?: number;

  @IsOptional()
  @IsString()
  templateId?:
    | 'vintage-journal'
    | 'cyberpunk'
    | 'healing-illustration'
    | 'minimal-paper'
    | 'polaroid-wall';
}

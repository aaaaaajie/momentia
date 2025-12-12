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

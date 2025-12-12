export type CollageElement = {
  id: string;
  prompt: string;
  /** 期望为透明 PNG 贴纸/装饰 */
  kind: 'sticker' | 'frame' | 'decoration';
};

export type CollageTextBlock = {
  id: string;
  kind: 'date' | 'title' | 'body';
  text: string;
  /** 0~1 相对坐标/尺寸 */
  x: number;
  y: number;
  w: number;
  h: number;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  /** 可选：旋转角度（度） */
  rotate?: number;
};

export type CollagePhotoPlacement = {
  id: string;
  /** 0~2，对应上传的第 N 张图片 */
  sourceIndex: number;
  /** 0~1 相对坐标/尺寸 */
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  style?: 'polaroid' | 'tape' | 'clean';
  cornerRadius?: number;
  shadow?: boolean;
};

export type CollageLayout = {
  /** 推荐画布尺寸（像素） */
  canvas: { width: number; height: number };
  /** 背景版式：paper/stationery 会偏“手账纸张”效果 */
  backgroundStyle?: 'paper' | 'stationery' | 'minimal' | 'poster';
  /** 照片摆放（1~3 个） */
  photos: CollagePhotoPlacement[];
  /** 文本块（日期/标题/正文可选） */
  texts: CollageTextBlock[];
  /** 贴纸元素（对应 elements 生成的素材） */
  stickers?: Array<{
    elementId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rotate?: number;
  }>;
};

export type CollagePlan = {
  /** 整体风格描述（用于生成背景与贴纸） */
  style: string;
  palette?: string[];

  /** 背景生成提示词（偏纸张/纹理/留白） */
  backgroundPrompt: string;

  /** 贴纸/装饰素材的生成清单（2-8 个） */
  elements: CollageElement[];

  /** 版式（可执行，用于服务端合成） */
  layout: CollageLayout;

  /** 额外说明 */
  notes?: string;
};

export type CollageGenerateResult = {
  /** 最终合成图（png base64，无 dataURL 前缀） */
  imageBase64: string;
  /** 背景（png base64） */
  backgroundBase64: string;
  /** 元素素材（png base64） */
  assets: Array<{ id: string; kind: string; base64: string; prompt: string }>;
  plan: CollagePlan;
};

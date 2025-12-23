export type CollageElement = {
  id: string;
  prompt: string;
  kind: 'sticker' | 'frame' | 'decoration';
};

export type CollageTextBlock = {
  id: string;
  kind: 'date' | 'title' | 'body';
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  rotate?: number;
};

export type CollagePhotoPlacement = {
  id: string;
  sourceIndex: number;
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
  canvas: { width: number; height: number };
  backgroundStyle?: 'paper' | 'stationery' | 'minimal' | 'poster';
  photos: CollagePhotoPlacement[];
  texts: CollageTextBlock[];
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
  style: string;
  palette?: string[];
  backgroundPrompt: string;
  elements: CollageElement[];
  layout: CollageLayout;
  notes?: string;
};

export type CollageGenerateResult = {
  imageBase64: string;
  backgroundBase64: string;
  assets: Array<{ id: string; kind: string; base64: string; prompt: string }>;
  plan: CollagePlan;
};

export type CollageGenerateParams = {
  prompt: string;
  style?: string;
  templateId?: string;
  files?: any[];
  width?: number;
  height?: number;
  onProgress?: (e: { stage: string; percent: number; message?: string }) => void;
};
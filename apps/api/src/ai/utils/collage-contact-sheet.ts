// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

export type ContactSheetOptions = {
  width: number;
  height: number;
  /** 最多 3 张 */
  imagesBase64: string[];
  background?: string; // hex 或留空
  margin?: number;
};

/**
 * 把 1-3 张图片拼成一张“参考底图”（contact sheet / moodboard）。
 * 目标：
 * - 每张都出现
 * - 尽量清晰（contain + padding）
 * - 统一画布尺寸，便于 SD/OpenAI 作为参考图
 */
export async function createContactSheetPngBase64(opts: ContactSheetOptions): Promise<string> {
  const margin = opts.margin ?? 24;
  const bg = opts.background ?? '#ffffff';

  const W = Math.max(256, Math.floor(opts.width));
  const H = Math.max(256, Math.floor(opts.height));

  const n = Math.min(3, opts.imagesBase64.length);
  const images = opts.imagesBase64.slice(0, n);

  // 画布
  const canvas = sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: bg,
    },
  });

  // 布局：
  // 1 张：全屏
  // 2 张：左右
  // 3 张：上 2 下 1
  type Slot = { x: number; y: number; w: number; h: number };
  const slots: Slot[] = (() => {
    if (n === 1) {
      return [{ x: margin, y: margin, w: W - margin * 2, h: H - margin * 2 }];
    }
    if (n === 2) {
      const w = Math.floor((W - margin * 3) / 2);
      const h = H - margin * 2;
      return [
        { x: margin, y: margin, w, h },
        { x: margin * 2 + w, y: margin, w, h },
      ];
    }
    // n === 3
    const topW = Math.floor((W - margin * 3) / 2);
    const topH = Math.floor((H - margin * 3) / 2);
    const bottomW = W - margin * 2;
    const bottomH = H - margin * 3 - topH;
    return [
      { x: margin, y: margin, w: topW, h: topH },
      { x: margin * 2 + topW, y: margin, w: topW, h: topH },
      { x: margin, y: margin * 2 + topH, w: bottomW, h: bottomH },
    ];
  })();

  const composites: any[] = [];

  for (let i = 0; i < images.length; i++) {
    const slot = slots[i];
    const imgBuf = Buffer.from(images[i], 'base64');

    // contain：保证不裁切（确保“都出现”）
    const resized = await sharp(imgBuf)
      .rotate()
      .resize({
        width: slot.w,
        height: slot.h,
        fit: 'contain',
        background: bg,
      })
      .png()
      .toBuffer();

    composites.push({ input: resized, left: slot.x, top: slot.y });
  }

  const out = await canvas.composite(composites).png({ quality: 100 }).toBuffer();
  return out.toString('base64');
}

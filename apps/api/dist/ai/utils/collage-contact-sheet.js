"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContactSheetPngBase64 = createContactSheetPngBase64;
const sharp = require('sharp');
async function createContactSheetPngBase64(opts) {
    const margin = opts.margin ?? 24;
    const bg = opts.background ?? '#ffffff';
    const W = Math.max(256, Math.floor(opts.width));
    const H = Math.max(256, Math.floor(opts.height));
    const n = Math.min(3, opts.imagesBase64.length);
    const images = opts.imagesBase64.slice(0, n);
    const canvas = sharp({
        create: {
            width: W,
            height: H,
            channels: 4,
            background: bg,
        },
    });
    const slots = (() => {
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
    const composites = [];
    for (let i = 0; i < images.length; i++) {
        const slot = slots[i];
        const imgBuf = Buffer.from(images[i], 'base64');
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
//# sourceMappingURL=collage-contact-sheet.js.map
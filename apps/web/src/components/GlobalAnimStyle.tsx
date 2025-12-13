export default function GlobalAnimStyle() {
  const globalAnimCss = `
    @keyframes mm_shimmer {
      0% { transform: translateX(-45%) rotate(18deg); opacity: 0; }
      20% { opacity: 0.35; }
      50% { opacity: 0.22; }
      100% { transform: translateX(110%) rotate(18deg); opacity: 0; }
    }
    @keyframes mm_breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.006); }
    }
    @keyframes mm_twinkle {
      0%, 100% { opacity: 0.20; transform: scale(1); filter: blur(0px); }
      40% { opacity: 0.95; transform: scale(1.06); filter: blur(0.6px); }
      70% { opacity: 0.35; transform: scale(1.01); filter: blur(0.2px); }
    }
    @keyframes mm_twinkle2 {
      0%, 100% { opacity: 0.10; transform: scale(1); }
      50% { opacity: 0.65; transform: scale(1.08); }
    }
    @keyframes mm_drift {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(0, -10px, 0); }
    }

    /* ---- Momentia: floating uploader hover micro-interaction ---- */
    .mm-input-upload {
      /* 通过变量叠加 transform，避免 hover 覆盖组件内联的 rotate(-8deg) */
      --mm-upload-scale: 1;
      transform: rotate(-8deg) scale(var(--mm-upload-scale));
      transform-origin: center;
      will-change: transform, box-shadow;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    /* Desktop / pointer devices */
    @media (hover: hover) and (pointer: fine) {
      .mm-input-upload:hover {
        --mm-upload-scale: 1.06;
        box-shadow: none;
      }

      .mm-input-upload:active {
        --mm-upload-scale: 1.02;
        box-shadow: none;
      }
    }

    /* Touch devices: tap feedback */
    @media (hover: none) and (pointer: coarse) {
      .mm-input-upload:active {
        --mm-upload-scale: 1.05;
      }
    }

    /* Respect reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .mm-input-upload {
        transition: none;
      }
      .mm-photo-card {
        transition: none;
      }
    }

    /* 无照片时：悬浮才显示“虚线高亮”边框（单一边框效果） */
    .mm-input-upload .mm-photo-add {
      /* 默认不高亮 */
      box-shadow: 0 10px 22px rgba(16, 40, 31, 0.1);
    }

    @media (hover: hover) and (pointer: fine) {
      .mm-input-upload:hover .mm-photo-add {
        /* 用 box-shadow 模拟虚线边框，避免 outline 叠加导致“双边框” */
        box-shadow:
          0 0 0 2px rgba(6, 94, 234, 0.18),
          0 10px 22px rgba(16, 40, 28, 0.1);
      }
    }

    /* 移除之前基于 outline 的无照片高亮规则（避免出现两个边框） */
    .mm-input-upload .ant-upload-list-picture-card:empty + .ant-upload.ant-upload-select,
    .mm-input-upload .ant-upload-list-picture-card:empty + .ant-upload-wrapper .ant-upload.ant-upload-select {
      /* no-op: keep existing layout */
    }

    .mm-input-upload .ant-upload-wrapper,
    .mm-input-upload .ant-upload-list {
      margin: 0;
      padding: 0;
    }

    /* 无照片时：高亮“悬浮上传框”的边框 */
    .mm-input-upload .ant-upload-list-picture-card:empty + .ant-upload.ant-upload-select,
    .mm-input-upload .ant-upload-list-picture-card:empty + .ant-upload-wrapper .ant-upload.ant-upload-select {
      border-radius: 12px;
      outline-offset: 2px;
    }

    @media (hover: hover) and (pointer: fine) {
      .mm-input-upload .ant-upload-list-picture-card:empty + .ant-upload.ant-upload-select:hover,
      .mm-input-upload .ant-upload-list-picture-card:empty + .ant-upload-wrapper .ant-upload.ant-upload-select:hover {
      }
    }

    .mm-input-upload .ant-upload-list-picture-card {
      display: flex;
      align-items: flex-start;
      gap: 0;
    }

    /* antd 默认 item 盒子会影响定位，重置掉 */
    .mm-input-upload .ant-upload-list-picture-card .ant-upload-list-item,
    .mm-input-upload .ant-upload-list-picture-card .ant-upload-list-item-container {
      width: auto !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      overflow: visible !important;
      position: relative;
    }

    .mm-input-upload .ant-upload.ant-upload-select {
      width: auto !important;
      height: auto !important;
      margin: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }

    /* ---- Photo stack interaction ---- */
    .mm-photo-stack {
      position: relative;
      width: 56px;
      height: 76px;
    }

    /* 无照片时（只有 + 卡片）也允许在 hover 展开宽度。
       如果内部只有一个绝对定位卡片，父容器宽度会按这里的规则展开。*/
    @media (hover: hover) and (pointer: fine) {
      .mm-input-upload:hover .mm-photo-stack {
        width: 56px; /* 4*56 + 3*10 */
      }
    }

    .mm-photo-deck {
      position: relative;
      width: 56px;
      height: 76px;
    }

    .mm-photo-card {
      width: 56px;
      height: 76px;
      position: absolute;
      left: 0;
      top: 0;
      transform-origin: 50% 85%;
      /* 改为向左/向下叠放：index 越大越靠前（更接近“+ 在上面”） */
      transform: translate3d(calc(var(--mm-i) * -6px), calc(var(--mm-i) * 3px), 0) rotate(var(--mm-angle));
      transition: transform 180ms ease, box-shadow 180ms ease;
      z-index: calc(10 + var(--mm-i));
    }

    .mm-photo-inner {
      width: 100%;
      height: 100%;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e7e9ee;
      background: #ffffff;
      box-shadow: 0 10px 22px rgba(16,24,40,0.10);
    }

    /* “+”卡片 */
    .mm-photo-add {
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e7e9ee;
      background: #ffffff;
      box-shadow: 0 10px 22px rgba(16,24,40,0.10);
    }

    .mm-photo-add-plus {
      font-size: 26px;
      line-height: 1;
      color: #667085;
    }

    /* 有照片时的圆形上传按钮（图二） */
    .mm-photo-add-fab {
      position: absolute;
      right: -8px;
      bottom: -10px;
      z-index: 120;
      display: block;
    }

    .mm-photo-add-fab-btn {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 0;
      background: rgba(255,255,255,0.96);
      box-shadow: 0 14px 30px rgba(16,24,40,0.18);
      color: #111827;
      font-size: 26px;
      line-height: 44px;
      cursor: pointer;
      padding: 0;
    }

    @media (hover: hover) and (pointer: fine) {
      /* 单张卡片 hover：抬起 + 轻微放大 */
      .mm-photo-card:hover {
        transform: translate3d(
            calc(var(--mm-i) * -6px),
            calc(var(--mm-i) * 3px - 10px),
            0
          )
          rotate(calc(var(--mm-angle) * 0.8))
          scale(1.02);
        z-index: 999;
      }

      /* 删除按钮仅在单张 hover 时显示 */
      .mm-photo-card:hover .mm-photo-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      /* 圆形按钮 hover 也给一点反馈 */
      .mm-photo-add-fab-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 18px 36px rgba(16,24,40,0.22);
      }
      .mm-photo-add-fab-btn:active {
        transform: translateY(0px);
        box-shadow: 0 14px 30px rgba(16,24,40,0.18);
      }
    }

    /* 默认不显示删除；悬浮到单张卡片时显示 */
    .mm-photo-remove {
      display: none;
      position: absolute;
      left: -8px;
      top: -8px;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: none;
      background: rgba(17, 25, 40, 0.9);
      color: #fff;
      line-height: 22px;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      z-index: 50;
    }

    @media (hover: hover) and (pointer: fine) {
      .mm-photo-card:hover .mm-photo-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      /* 悬浮整个堆叠区域：展开（根据最多4张：3图+1个+） */
      .mm-photo-stack:hover {
        width: 272px; /* 4*56 + 3*10 */
      }

      .mm-photo-stack:hover .mm-photo-deck {
        width: 272px;
        height: 76px;
      }

      .mm-photo-stack:hover .mm-photo-card {
        transform: translate3d(calc(var(--mm-i) * 66px), 0, 0) rotate(var(--mm-angle));
      }

      /* 悬浮单张时稍微抬起 */
      .mm-photo-card:hover {
        transform: translate3d(calc(var(--mm-i) * 66px), -6px, 0) rotate(calc(var(--mm-angle) * 0.7));
      }
    }

    /* ---- Momentia: minimal responsive/mobile tweaks ---- */
    :root {
      --mm-page-bg: #f6f7fb;
      --mm-content-max: 980px;
    }

    html, body {
      height: 100%;
    }

    body {
      margin: 0;
      background: var(--mm-page-bg);
      -webkit-text-size-adjust: 100%;
    }

    /* Use dynamic viewport height on mobile (keyboard/URL bar friendly) */
    .mm-app {
      height: 100vh;
      height: 100dvh;
      background: var(--mm-page-bg);
      overscroll-behavior: none;
    }

    .mm-panel {
      max-width: var(--mm-content-max);
      margin: 0 auto;
    }

    /* Safe-area for iOS */
    .mm-header {
      padding-top: env(safe-area-inset-top);
    }

    .mm-composer {
      padding-bottom: env(safe-area-inset-bottom);
    }

    /* Narrow screens */
    @media (max-width: 640px) {
      .mm-header-inner {
        padding: 12px 12px;
      }

      .mm-header-controls {
        width: 100%;
        justify-content: flex-start;
      }

      .mm-list {
        padding: 12px 12px 8px;
      }

      .mm-composer-inner {
        padding: 10px 12px;
      }

      .mm-input-wrap textarea {
        padding-left: 82px !important;
        padding-right: 58px !important;
        border-radius: 14px !important;
      }

      .mm-input-upload {
        left: 10px !important;
        top: 10px !important;
      }

      .mm-input-send {
        right: 10px !important;
        bottom: 10px !important;
      }

      .mm-composer-row {
        gap: 10px;
      }

      .mm-composer-input {
        min-width: 0;
      }

      .mm-composer-uploader {
        min-width: 0;
        width: 100%;
      }

      .mm-send {
        width: 100%;
      }
    }
  `;

  return <style>{globalAnimCss}</style>;
}

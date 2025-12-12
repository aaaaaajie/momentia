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
  `;

  return <style>{globalAnimCss}</style>;
}

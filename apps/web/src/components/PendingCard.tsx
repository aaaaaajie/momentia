import { Progress, Typography } from 'antd';

export default function PendingCard(props: {
  progress?: { stage: string; percent: number; message?: string };
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 14,
          border: '1px solid rgba(226,232,240,1)',
          background:
            'radial-gradient(1200px 420px at 18% 22%, rgba(59,130,246,0.22) 0%, rgba(2,6,23,0) 55%), radial-gradient(900px 320px at 82% 78%, rgba(34,211,153,0.18) 0%, rgba(2,6,23,0) 60%), linear-gradient(135deg, #0b1222 0%, #070b16 45%, #0b1020 100%)',
          width: 640,
          maxWidth: '100%',
          marginRight: 'auto',
          transform: 'translateZ(0)',
        }}
      >
        {/* 星星背景层（轻量 SVG data-uri） */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='160' viewBox='0 0 240 160'%3E%3Cg%3E%3Ccircle cx='18' cy='22' r='1.5' fill='%23FFFFFF' opacity='0.95'/%3E%3Ccircle cx='52' cy='44' r='1.1' fill='%23C7D2FE' opacity='0.85'/%3E%3Ccircle cx='96' cy='30' r='1.3' fill='%23E0F2FE' opacity='0.9'/%3E%3Ccircle cx='138' cy='58' r='1.0' fill='%23FFFFFF' opacity='0.72'/%3E%3Ccircle cx='176' cy='28' r='1.2' fill='%23ECFDF5' opacity='0.82'/%3E%3Ccircle cx='210' cy='62' r='1.4' fill='%23E0E7FF' opacity='0.9'/%3E%3Ccircle cx='28' cy='112' r='1.2' fill='%23FFFFFF' opacity='0.85'/%3E%3Ccircle cx='70' cy='132' r='1.0' fill='%23C7D2FE' opacity='0.78'/%3E%3Ccircle cx='118' cy='118' r='1.45' fill='%23E0F2FE' opacity='0.95'/%3E%3Ccircle cx='160' cy='136' r='1.1' fill='%23FFFFFF' opacity='0.82'/%3E%3Ccircle cx='204' cy='118' r='1.3' fill='%23ECFDF5' opacity='0.9'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundRepeat: 'repeat',
            backgroundSize: '260px 170px',
            opacity: 0.65,
            animation: 'mm_drift 4.6s ease-in-out infinite alternate',
            pointerEvents: 'none',
          }}
        />

        {/* 星光闪烁层 1：更亮 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: [
              'radial-gradient(circle at 18% 22%, rgba(96,165,250,1) 0 2.2px, rgba(96,165,250,0) 18px)',
              'radial-gradient(circle at 72% 36%, rgba(52,211,153,0.95) 0 1.9px, rgba(52,211,153,0) 20px)',
              'radial-gradient(circle at 85% 70%, rgba(129,140,248,1) 0 2.1px, rgba(129,140,248,0) 20px)',
              'radial-gradient(circle at 35% 78%, rgba(96,165,250,0.9) 0 1.8px, rgba(96,165,250,0) 18px)',
            ].join(', '),
            opacity: 0.9,
            animation: 'mm_twinkle 1.25s ease-in-out infinite',
            pointerEvents: 'none',
            willChange: 'opacity, transform, filter',
            transform: 'translate3d(0,0,0)',
          }}
        />

        {/* 星光闪烁层 2：更多碎星 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: [
              'radial-gradient(circle at 12% 60%, rgba(255,255,255,0.9) 0 1.4px, rgba(255,255,255,0) 14px)',
              'radial-gradient(circle at 58% 20%, rgba(255,255,255,0.8) 0 1.2px, rgba(255,255,255,0) 14px)',
              'radial-gradient(circle at 78% 52%, rgba(255,255,255,0.88) 0 1.5px, rgba(255,255,255,0) 16px)',
              'radial-gradient(circle at 46% 46%, rgba(255,255,255,0.75) 0 1.1px, rgba(255,255,255,0) 14px)',
              'radial-gradient(circle at 90% 18%, rgba(255,255,255,0.8) 0 1.2px, rgba(255,255,255,0) 14px)',
              'radial-gradient(circle at 22% 84%, rgba(255,255,255,0.7) 0 1.0px, rgba(255,255,255,0) 12px)',
            ].join(', '),
            opacity: 0.55,
            animation: 'mm_twinkle2 1.9s ease-in-out infinite',
            pointerEvents: 'none',
            willChange: 'opacity, transform',
            transform: 'translate3d(0,0,0)',
          }}
        />

        {/* 内容区域：深色卡面 */}
        <div
          style={{
            animation: 'mm_breathe 2.8s ease-in-out infinite',
            padding: 12,
          }}
        >
          <div
            style={{
              height: 220,
              borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.09), 0 14px 40px rgba(0,0,0,0.28)',
              backdropFilter: 'blur(6px)',
            }}
          />
        </div>

        {/* 渐变扫光（shimmer）*/}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -60,
            left: 0,
            width: '55%',
            height: '160%',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.23) 40%, rgba(255,255,255,0) 85%)',
            filter: 'blur(2px)',
            animation: 'mm_shimmer 2.2s ease-in-out infinite',
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />

        {/* 顶部文案 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.94)',
            fontWeight: 750,
            fontSize: 22,
            letterSpacing: 0.2,
            textShadow: '0 6px 20px rgba(0,0,0,0.6)',
            padding: '10px 14px',
            borderRadius: 999,
            background: 'rgba(2,6,23,0.35)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.10)',
            whiteSpace: 'nowrap',
          }}
        >
          {`${Math.round((props.progress?.percent ?? 0) * 100)}%${
            props.progress?.message ? ` ${props.progress.message}` : ' 造梦中'
          }`}
        </div>

        {/* 底部全宽进度条 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '10px 12px 12px',
          }}
        >
          <Progress
            percent={Math.round((props.progress?.percent ?? 0) * 100)}
            status="active"
            showInfo={false}
            strokeColor={{ from: '#60A5FA', to: '#34D399' }}
            trailColor="rgba(255,255,255,0.14)"
            size="small"
          />
        </div>
      </div>

      {/* 阶段说明（可选，小字） */}
      <div style={{ marginTop: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {(props.progress?.stage || 'progress') + (props.progress?.message ? `：${props.progress.message}` : '')}
        </Typography.Text>
      </div>
    </div>
  );
}

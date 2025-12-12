import { Button, Tooltip } from 'antd';
import IconDownload from './IconDownload';
import { downloadImageFromSrc } from '../lib/utils';

export default function MessageImages(props: { images: string[]; createdAt: number }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        }}
      >
        {props.images.map((src, idx) => (
          <div
            key={src}
            className="mm-img-wrap"
            style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #eef0f3',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget.querySelector('.mm-img-actions') as HTMLElement | null;
              if (el) el.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget.querySelector('.mm-img-actions') as HTMLElement | null;
              if (el) el.style.opacity = '0';
            }}
          >
            <img
              src={src}
              alt="img"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
              }}
            />

            <div
              className="mm-img-actions"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                padding: 10,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 100%)',
                opacity: 0,
                transition: 'opacity 160ms ease',
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
                <Tooltip title="下载">
                  <Button
                    size="large"
                    type="primary"
                    icon={<IconDownload size={18} />}
                    style={{
                      height: 36,
                      paddingInline: 12,
                      borderRadius: 10,
                      boxShadow: '0 10px 22px rgba(0,0,0,0.18)',
                    }}
                    onClick={() => downloadImageFromSrc(src, `momentia-${props.createdAt}-${idx + 1}.png`)}
                  />
                </Tooltip>
              </div>
            </div>

            <style>{`
              .mm-img-wrap:hover .mm-img-actions { opacity: 1; }
            `}</style>
          </div>
        ))}
      </div>
    </div>
  );
}

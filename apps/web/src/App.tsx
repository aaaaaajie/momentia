import { useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Input,
  Typography,
  Upload,
  message,
  Segmented,
  Space,
  Collapse,
  Progress,
  Skeleton,
  Alert,
  Tooltip,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';

const IconDownload = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 3v10m0 0 4-4m-4 4-4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

type Role = 'user' | 'assistant' | 'system';

type ChatMessage = {
  id: string;
  role: Role;
  text?: string;
  images?: string[]; // object url
  result?: any; // api result
  createdAt: number;
  pending?: boolean;
  progress?: { stage: string; percent: number; message?: string };
  error?: { code?: string; message?: string; details?: any; statusCode?: number };
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileToObjectUrl(f: File) {
  return URL.createObjectURL(f);
}

function downloadImageFromSrc(src: string, filename = `momentia-${Date.now()}.png`) {
  const a = document.createElement('a');
  a.href = src;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'assistant',
      text: '把你的想法写成一句话，并上传 1~3 张照片。我会生成一张手账风拼贴图。',
      createdAt: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [templateId, setTemplateId] = useState<string>('vintage-journal');
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const send = useMemo(
    () =>
      async () => {
        const prompt = input.trim();
        const files = fileList
          .map((x) => x.originFileObj as File | undefined)
          .filter(Boolean) as File[];

        const hasPrompt = Boolean(prompt);
        const hasFiles = files.length > 0;

        if (!hasPrompt && !hasFiles) {
          message.warning('请输入内容或上传照片');
          return;
        }

        const userMsg: ChatMessage = {
          id: uid(),
          role: 'user',
          text: hasPrompt ? prompt : undefined,
          images: hasFiles ? files.map(fileToObjectUrl) : undefined,
          createdAt: Date.now(),
        };

        const pendingId = uid();
        const pendingMsg: ChatMessage = {
          id: pendingId,
          role: 'assistant',
          text: '正在生成中…',
          createdAt: Date.now(),
          pending: true,
          progress: { stage: 'init', percent: 0, message: '准备中' },
        };

        setMessages((prev) => [...prev, userMsg, pendingMsg]);
        setInput('');
        setLoading(true);
        scrollToBottom();

        try {
          const fd = new FormData();
          for (const f of files) fd.append('files', f);
          if (hasPrompt) fd.append('prompt', prompt);
          fd.append('templateId', templateId);

          const res = await fetch(`${apiBase}/api/ai/compose/stream`, {
            method: 'POST',
            body: fd,
          });

          if (!res.ok || !res.body) {
            const data = await res.json().catch(() => null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      pending: false,
                      error: {
                        code: data?.code,
                        message: data?.message || data?.error || res.statusText,
                        details: data?.details,
                        statusCode: data?.statusCode || res.status,
                      },
                      text: `生成失败：${data?.message || res.statusText}`,
                      result: data,
                    }
                  : m,
              ),
            );
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buf = '';

          const applyProgress = (p: any) => {
            const percent = typeof p?.percent === 'number' ? p.percent : 0;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      pending: true,
                      progress: {
                        stage: String(p?.stage || 'progress'),
                        percent,
                        message: p?.message,
                      },
                      text: p?.message ? `正在生成：${p.message}` : m.text,
                    }
                  : m,
              ),
            );
          };

          const applyDone = (data: any) => {
            const imgB64 = data?.imageBase64;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      pending: false,
                      progress: { stage: 'done', percent: 1, message: '完成' },
                      text: '已生成。你可以继续补充：比如“再复古一点 / 多加贴纸 / 标题改成……” 。',
                      result: data,
                      images: imgB64 ? [`data:image/png;base64,${imgB64}`] : undefined,
                    }
                  : m,
              ),
            );
            setFileList([]);
          };

          const applyError = (err: any) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      pending: false,
                      error: err,
                      text: `生成失败：${err?.message || '未知错误'}`,
                      result: err,
                    }
                  : m,
              ),
            );
            setFileList([]);
          };

          const parseSse = (chunk: string) => {
            buf += chunk;
            // SSE 事件以空行分隔
            while (true) {
              const idx = buf.indexOf('\n\n');
              if (idx === -1) break;
              const raw = buf.slice(0, idx);
              buf = buf.slice(idx + 2);

              let event = 'message';
              let dataLine = '';
              for (const line of raw.split('\n')) {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                if (line.startsWith('data:')) dataLine += line.slice(5).trim();
              }

              if (!dataLine) continue;
              let payload: any;
              try {
                payload = JSON.parse(dataLine);
              } catch {
                payload = dataLine;
              }

              if (event === 'progress') applyProgress(payload);
              if (event === 'done') applyDone(payload);
              if (event === 'error') applyError(payload);
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            parseSse(decoder.decode(value, { stream: true }));
            scrollToBottom();
          }
        } catch (e: any) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? {
                    ...m,
                    pending: false,
                    error: { code: 'NETWORK', message: e?.message || String(e) },
                    text: `生成失败：${e?.message || String(e)}`,
                  }
                : m,
            ),
          );
        } finally {
          setLoading(false);
          scrollToBottom();
        }
      },
    [fileList, input, templateId],
  );

  // 全局注入一次动画 keyframes（避免放在 map 内导致部分浏览器不触发/被重置）
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

  return (
    <Flex vertical style={{ height: '100vh', background: '#f6f7fb' }}>
      <style>{globalAnimCss}</style>
      <div
        style={{
          borderBottom: '1px solid #eef0f3',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '14px 16px' }}>
          <Flex align="center" justify="space-between">
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Momentia
              </Typography.Title>
              <Typography.Text type="secondary">
                手账/拼贴生成（Chat）
              </Typography.Text>
            </div>

            <Space>
              <Typography.Text type="secondary">模板</Typography.Text>
              <Segmented
                value={templateId}
                onChange={(v) => setTemplateId(String(v))}
                options={[
                  { label: '复古', value: 'vintage-journal' },
                  { label: '治愈', value: 'healing-illustration' },
                  { label: '极简', value: 'minimal-paper' },
                  { label: '拍立得', value: 'polaroid-wall' },
                ]}
              />
            </Space>
          </Flex>
        </div>
      </div>

      {/* chat list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '18px 16px 10px',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <Flex vertical gap={12}>
            {messages.map((m) => (
              <Flex key={m.id} justify={m.role === 'user' ? 'flex-end' : 'flex-start'}>
                <div
                  style={{
                    width: 'min(760px, 100%)',
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Card
                    size="small"
                    styles={{ body: { padding: 12 } }}
                    style={{
                      maxWidth: 760,
                      borderRadius: 16,
                      background: '#ffffff',
                      border: m.role === 'user' ? '1px solid #e7e9ee' : '1px solid #eef0f3',
                      boxShadow:
                        m.role === 'user'
                          ? '0 8px 28px rgba(16,24,40,0.06)'
                          : '0 8px 28px rgba(16,24,40,0.05)',
                    }}
                  >
                    {m.pending ? (
                      <div style={{ marginBottom: 10 }}>
                        <div
                          style={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: 14,
                            border: '1px solid rgba(226,232,240,1)',
                            background: 'radial-gradient(1200px 420px at 18% 22%, rgba(59,130,246,0.22) 0%, rgba(2,6,23,0) 55%), radial-gradient(900px 320px at 82% 78%, rgba(34,211,153,0.18) 0%, rgba(2,6,23,0) 60%), linear-gradient(135deg, #0b1222 0%, #070b16 45%, #0b1020 100%)',
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
                                background:
                                  'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                                boxShadow:
                                  'inset 0 0 0 1px rgba(255,255,255,0.09), 0 14px 40px rgba(0,0,0,0.28)',
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
                            {`${Math.round((m.progress?.percent ?? 0) * 100)}%${m.progress?.message ? ` ${m.progress.message}` : ' 造梦中'}`}
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
                              percent={Math.round((m.progress?.percent ?? 0) * 100)}
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
                            {(m.progress?.stage || 'progress') + (m.progress?.message ? `：${m.progress.message}` : '')}
                          </Typography.Text>
                        </div>
                      </div>
                    ) : null}

                    {m.error ? (
                      <div style={{ marginBottom: 10 }}>
                        <Alert
                          type="error"
                          showIcon
                          message={m.error.message || '生成失败'}
                          description={m.error.code ? `错误码：${m.error.code}` : undefined}
                        />
                      </div>
                    ) : null}

                    {m.text ? (
                      <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {m.text}
                      </Typography.Paragraph>
                    ) : null}

                    {m.images?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            display: 'grid',
                            gap: 8,
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                          }}
                        >
                          {m.images.map((src, idx) => (
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
                                const el = (e.currentTarget.querySelector('.mm-img-actions') as HTMLElement | null);
                                if (el) el.style.opacity = '1';
                              }}
                              onMouseLeave={(e) => {
                                const el = (e.currentTarget.querySelector('.mm-img-actions') as HTMLElement | null);
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
                                      onClick={() =>
                                        downloadImageFromSrc(src, `momentia-${m.createdAt}-${idx + 1}.png`)
                                      }
                                    >
                                    </Button>
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
                    ) : null}

                    {m.result ? (
                      <div style={{ marginTop: 10 }}>
                        <Collapse
                          size="small"
                          items={[
                            {
                              key: 'plan',
                              label: '查看生成计划（JSON）',
                              children: (
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(m.result?.plan ?? m.result, null, 2)}
                                </pre>
                              ),
                            },
                          ]}
                        />
                      </div>
                    ) : null}
                  </Card>
                </div>
              </Flex>
            ))}
          </Flex>
        </div>
      </div>

      {/* composer */}
      <div
        style={{
          borderTop: '1px solid #eef0f3',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '12px 16px' }}>
          <Flex gap={12} align="flex-end" wrap>
            <div style={{ flex: 1, minWidth: 320 }}>
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="写一段描述：如“写一篇日记，日期是... 标题... 正文... 把照片拼贴进去，风格手账感。”"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    void send();
                  }
                }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ⌘/Ctrl + Enter 发送
              </Typography.Text>
            </div>

            <div style={{ minWidth: 240 }}>
              <Upload
                accept="image/*"
                multiple
                maxCount={3}
                fileList={fileList}
                beforeUpload={() => false}
                onChange={({ fileList }) => setFileList(fileList)}
              >
                <Button style={{ width: '100%' }}>上传照片（最多 3 张）</Button>
              </Upload>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                建议：同一主题、同一色调
              </Typography.Text>
            </div>

            <Button
              type="primary"
              onClick={() => void send()}
              loading={loading}
              disabled={loading || (!input.trim() && fileList.length === 0)}
            >
              发送
            </Button>
          </Flex>
        </div>
      </div>
    </Flex>
  );
}

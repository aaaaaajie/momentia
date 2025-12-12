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
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

type Role = 'user' | 'assistant' | 'system';

type ChatMessage = {
  id: string;
  role: Role;
  text?: string;
  images?: string[]; // object url
  result?: any; // api result
  createdAt: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileToObjectUrl(f: File) {
  return URL.createObjectURL(f);
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

        if (!prompt) {
          message.warning('请输入内容');
          return;
        }
        if (files.length === 0) {
          message.warning('请上传 1~3 张照片');
          return;
        }

        const userMsg: ChatMessage = {
          id: uid(),
          role: 'user',
          text: prompt,
          images: files.map(fileToObjectUrl),
          createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        scrollToBottom();

        try {
          const fd = new FormData();
          for (const f of files) fd.append('files', f);
          fd.append('prompt', prompt);
          fd.append('templateId', templateId);

          // 走 vite proxy：/api -> http://localhost:3000
          const res = await fetch(`${apiBase}/api/ai/compose`, {
            method: 'POST',
            body: fd,
          });

          const data = await res.json().catch(() => null);
          if (!res.ok) {
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: 'assistant',
                text: `生成失败：${data?.message || res.statusText}`,
                result: data,
                createdAt: Date.now(),
              },
            ]);
            return;
          }

          const imgB64 = data?.imageBase64;
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              text: '已生成。你可以继续补充：比如“再复古一点 / 多加贴纸 / 标题改成……”。',
              result: data,
              images: imgB64 ? [`data:image/png;base64,${imgB64}`] : undefined,
              createdAt: Date.now(),
            },
          ]);
        } finally {
          setLoading(false);
          scrollToBottom();
        }
      },
    [fileList, input, templateId],
  );

  return (
    <Flex vertical style={{ height: '100vh', background: '#f6f7fb' }}>
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
              <Flex
                key={m.id}
                justify={m.role === 'user' ? 'flex-end' : 'flex-start'}
              >
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
                      background: m.role === 'user' ? '#ffffff' : '#ffffff',
                      border: m.role === 'user' ? '1px solid #e7e9ee' : '1px solid #eef0f3',
                      boxShadow: m.role === 'user'
                        ? '0 8px 28px rgba(16,24,40,0.06)'
                        : '0 8px 28px rgba(16,24,40,0.05)',
                    }}
                  >
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
                          {m.images.map((src) => (
                            <img
                              key={src}
                              src={src}
                              alt="img"
                              style={{
                                width: '100%',
                                borderRadius: 12,
                                border: '1px solid #eef0f3',
                                objectFit: 'cover',
                              }}
                            />
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

            <Button type="primary" onClick={() => void send()} loading={loading}>
              发送
            </Button>
          </Flex>
        </div>
      </div>
    </Flex>
  );
}

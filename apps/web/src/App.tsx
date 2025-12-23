import { useMemo, useRef, useState } from 'react';
import { Flex, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';

import AppHeader from './components/AppHeader';
import ChatMessages from './components/ChatMessages';
import type { ChatMessage } from './components/ChatMessages';
import Composer from './components/Composer';
import GlobalAnimStyle from './components/GlobalAnimStyle';
import { uid } from './lib/utils';
import { composeStream } from './lib/composeStream';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

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
  const [templateId, setTemplateId] = useState<string>('minimal-paper');
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastRequestRef = useRef<{ prompt: string; files: File[]; templateId: string } | null>(null);
  const requestByAssistantMsgIdRef = useRef<Record<string, { prompt: string; files: File[]; templateId: string }>>({});

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const send = useMemo(
    () =>
      async (override?: { prompt?: string; files?: File[]; templateId?: string }) => {
        try {
          await composeStream({
            input,
            fileList,
            templateId,
            override,
            onInit: ({ userMsg, pendingMsg, pendingId, prompt, files, templateId }) => {
              lastRequestRef.current = { prompt, files, templateId };
              requestByAssistantMsgIdRef.current[pendingId] = { prompt, files, templateId };

              setMessages((prev) => [...prev, userMsg, pendingMsg]);
              if (!override) setInput('');
              setLoading(true);
              scrollToBottom();
            },
            onProgress: (pendingId, p) => {
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
              scrollToBottom();
            },
            onDone: (pendingId, data, override) => {
              // keep mapping so user can regenerate later
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === pendingId
                    ? {
                        ...m,
                        pending: false,
                        progress: { stage: 'done', percent: 1, message: '完成' },
                        text: '已生成。你可以继续补充：比如“再复古一点 / 多加贴纸 / 标题改成……” 。',
                        result: data,
                        images: data?.imageBase64 ? [`data:image/png;base64,${data.imageBase64}`] : undefined,
                      }
                    : m,
                ),
              );
              if (!override) setFileList([]);
              scrollToBottom();
            },
            onError: (pendingId, err, override) => {
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
              if (!override) setFileList([]);
              scrollToBottom();
            },
            onFinally: () => {
              setLoading(false);
              scrollToBottom();
            },
          });
        } catch (e: any) {
          if (String(e?.message || e) === 'EMPTY_INPUT') {
            message.warning('请输入内容或上传照片');
            return;
          }
          message.error(e?.message || String(e));
        }
      },
    [fileList, input, templateId],
  );

  return (
    <Flex vertical className="mm-app">
      <GlobalAnimStyle />
      <AppHeader templateId={templateId} onChangeTemplateId={setTemplateId} />

      <div
        ref={listRef}
        className="mm-list"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '18px 16px 10px',
        }}
      >
        <div className="mm-panel">
          <ChatMessages
            messages={messages}
            loading={loading}
            onRetry={() => {
              const last = lastRequestRef.current;
              if (!last) return;
              void send({ prompt: last.prompt, files: last.files, templateId: last.templateId });
            }}
            onRetryByMessage={(messageId) => {
              const req = requestByAssistantMsgIdRef.current[messageId];
              if (!req) return;
              void send({ prompt: req.prompt, files: req.files, templateId: req.templateId });
            }}
          />
        </div>
      </div>

      <Composer
        input={input}
        onChangeInput={setInput}
        fileList={fileList}
        onChangeFileList={setFileList}
        loading={loading}
        onSend={() => void send()}
      />
    </Flex>
  );
}

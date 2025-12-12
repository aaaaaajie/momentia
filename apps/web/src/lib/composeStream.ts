import type { UploadFile } from 'antd/es/upload/interface';
import type { ChatMessage } from '../components/ChatMessages';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

export type ComposeOverride = { prompt?: string; files?: File[]; templateId?: string };

export function filesFromUploadList(fileList: UploadFile[]) {
  return fileList.map((x) => x.originFileObj as File | undefined).filter(Boolean) as File[];
}

export async function composeStream(params: {
  input: string;
  fileList: UploadFile[];
  templateId: string;
  override?: ComposeOverride;
  onInit: (ctx: {
    userMsg: ChatMessage;
    pendingMsg: ChatMessage;
    pendingId: string;
    prompt: string;
    files: File[];
    templateId: string;
  }) => void;
  onProgress: (pendingId: string, p: any) => void;
  onDone: (pendingId: string, data: any, override?: ComposeOverride) => void;
  onError: (pendingId: string, err: any, override?: ComposeOverride) => void;
  onFinally: () => void;
}) {
  const prompt = (params.override?.prompt ?? params.input).trim();
  const files = (params.override?.files ?? filesFromUploadList(params.fileList)) as File[];
  const templateId = params.override?.templateId ?? params.templateId;

  const hasPrompt = Boolean(prompt);
  const hasFiles = files.length > 0;

  if (!hasPrompt && !hasFiles) {
    throw new Error('EMPTY_INPUT');
  }

  const pendingId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  params.onInit({
    userMsg: {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: 'user',
      text: hasPrompt ? prompt : undefined,
      images: hasFiles ? files.map((f) => URL.createObjectURL(f)) : undefined,
      createdAt: Date.now(),
    },
    pendingMsg: {
      id: pendingId,
      role: 'assistant',
      text: '正在生成中…',
      createdAt: Date.now(),
      pending: true,
      progress: { stage: 'init', percent: 0, message: '准备中' },
    },
    pendingId,
    prompt,
    files,
    templateId,
  });

  try {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    if (hasPrompt) fd.append('prompt', prompt);
    fd.append('templateId', templateId);

    const res = await fetch(`${apiBase}/api/ai/compose/stream`, { method: 'POST', body: fd });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => null);
      params.onError(
        pendingId,
        {
          code: data?.code,
          message: data?.message || data?.error || res.statusText,
          details: data?.details,
          statusCode: data?.statusCode || res.status,
        },
        params.override,
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buf = '';

    const parseSse = (chunk: string) => {
      buf += chunk;
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

        if (event === 'progress') params.onProgress(pendingId, payload);
        if (event === 'done') params.onDone(pendingId, payload, params.override);
        if (event === 'error') params.onError(pendingId, payload, params.override);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parseSse(decoder.decode(value, { stream: true }));
    }
  } catch (e: any) {
    params.onError(pendingId, { code: 'NETWORK', message: e?.message || String(e) }, params.override);
  } finally {
    params.onFinally();
  }
}

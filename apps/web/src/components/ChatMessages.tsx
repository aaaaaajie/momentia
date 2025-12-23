import { Button, Card, Flex, Typography } from 'antd';
import PendingCard from './PendingCard';
import MessageError from './MessageError';
import MessageImages from './MessageImages';
import MessagePlan from './MessagePlan';

export type Role = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: Role;
  text?: string;
  images?: string[];
  result?: any;
  createdAt: number;
  pending?: boolean;
  progress?: { stage: string; percent: number; message?: string };
  error?: { code?: string; message?: string; details?: any; statusCode?: number };
};

export default function ChatMessages(props: {
  messages: ChatMessage[];
  loading: boolean;
  onRetry: () => void;
  onRetryByMessage?: (messageId: string) => void;
}) {
  return (
    <Flex vertical gap={12}>
      {props.messages.map((m) => {
        const canRegenerate =
          m.role === 'assistant' && !m.pending && !m.error && !!m.result && !!props.onRetryByMessage;

        const retryThisMessage = () => {
          if (props.onRetryByMessage) return props.onRetryByMessage(m.id);
          props.onRetry();
        };

        return (
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
                {m.pending ? <PendingCard progress={m.progress} /> : null}

                {m.error ? (
                  <MessageError error={m.error} loading={props.loading} onRetry={retryThisMessage} />
                ) : null}

                {m.text ? (
                  <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.text}</Typography.Paragraph>
                ) : null}

                {m.images?.length ? <MessageImages images={m.images} createdAt={m.createdAt} /> : null}

                {m.result ? <MessagePlan result={m.result} /> : null}

                {canRegenerate ? (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                      type="text"
                      size="small"
                      disabled={props.loading}
                      onClick={() => props.onRetryByMessage?.(m.id)}
                      style={{ paddingInline: 6, borderRadius: 10 }}
                    >
                      ↻ 重新生成
                    </Button>
                  </div>
                ) : null}
              </Card>
            </div>
          </Flex>
        );
      })}
    </Flex>
  );
}

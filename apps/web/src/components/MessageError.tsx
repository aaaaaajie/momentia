import { Alert, Button, Typography } from 'antd';
import { canRetryByCode } from '../lib/retry';

export default function MessageError(props: {
  error: { code?: string; message?: string };
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <Alert
        type="error"
        showIcon
        message={props.error.message || '生成失败'}
        description={props.error.code ? `错误码：${props.error.code}` : undefined}
      />

      {canRetryByCode(props.error.code) ? (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button type="primary" disabled={props.loading} onClick={props.onRetry}>
            重新生成
          </Button>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            网络/超时类错误可重试
          </Typography.Text>
        </div>
      ) : null}
    </div>
  );
}
